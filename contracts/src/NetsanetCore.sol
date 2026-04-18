// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NetsanetCore — Patient-Owned Medical Records for Ethiopia
/// @author Nathaniel Abayneh (Woof Woof)
/// @notice This contract enables patients to own, store metadata for, and
///         selectively share their medical records on-chain.  Actual medical
///         data lives encrypted on IPFS; only CID pointers and access-control
///         state are stored here.
/// @dev    MVP-grade.  Category-based selective access is the key feature:
///         a doctor granted HIV_TREATMENT access literally cannot read
///         MENTAL_HEALTH record CIDs from this contract.

contract NetsanetCore {

    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    /// @notice Categories that partition a patient's medical history.
    ///         Access is granted per-category so a doctor requesting
    ///         HIV_TREATMENT access cannot see MENTAL_HEALTH records.
    enum RecordCategory {
        GENERAL_CONSULTATION,   // 0
        HIV_TREATMENT,          // 1
        MENTAL_HEALTH,          // 2
        LAB_RESULT,             // 3
        PRESCRIPTION,           // 4
        PRENATAL_CARE,          // 5
        CHRONIC_DISEASE         // 6
    }

    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    struct Patient {
        string  name;           // human-readable name (demo only)
        uint256 createdAt;
        bool    exists;
    }

    struct MedicalRecord {
        string         ipfsCID;        // pointer to encrypted JSON on IPFS
        RecordCategory category;       // which category this record belongs to
        string         recordType;     // human-readable sub-type, e.g. "CD4 Count"
        address        addedByClinic;  // wallet of the clinic/doctor who wrote this
        uint256        timestamp;
    }

    struct AccessGrant {
        address        doctor;
        RecordCategory category;       // access to ONE specific category
        uint256        grantedAt;
        uint256        expiresAt;
        bool           revoked;        // patient can revoke before expiry
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @dev patient wallet → Patient metadata
    mapping(address => Patient) public patients;

    /// @dev patient wallet → array of MedicalRecord
    mapping(address => MedicalRecord[]) private _patientRecords;

    /// @dev patient wallet → array of AccessGrant
    mapping(address => AccessGrant[]) private _accessGrants;

    /// @dev Lookup: patient → doctor → category → index in _accessGrants (+ 1).
    ///      Zero means "no grant exists".  We store index+1 so that 0 is the
    ///      sentinel for "not found".
    mapping(address => mapping(address => mapping(RecordCategory => uint256)))
        private _grantIndex;

    /// @dev Audit log entries per patient.
    mapping(address => AuditEntry[]) private _auditLog;

    struct AuditEntry {
        address        accessor;
        RecordCategory category;
        uint256        timestamp;
        string         action;    // "ACCESS_USED", "RECORD_ADDED", etc.
    }

    // ──────────────────────────────────────────────
    //  Events  (used for off-chain indexing & UI)
    // ──────────────────────────────────────────────

    event PatientRegistered(
        address indexed patient,
        string  name,
        uint256 timestamp
    );

    event RecordAdded(
        address indexed patient,
        address indexed clinic,
        RecordCategory  category,
        string          recordType,
        uint256         recordIndex,
        uint256         timestamp
    );

    event AccessGranted(
        address indexed patient,
        address indexed doctor,
        RecordCategory  category,
        uint256         expiresAt,
        uint256         timestamp
    );

    event AccessRevoked(
        address indexed patient,
        address indexed doctor,
        RecordCategory  category,
        uint256         timestamp
    );

    event AccessUsed(
        address indexed patient,
        address indexed doctor,
        RecordCategory  category,
        uint256         recordCount,
        uint256         timestamp
    );

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    /// @notice Caller must be a registered patient.
    modifier onlyPatient() {
        require(patients[msg.sender].exists, "Not a registered patient");
        _;
    }

    /// @notice The target address must be a registered patient.
    modifier patientExists(address _patient) {
        require(patients[_patient].exists, "Patient does not exist");
        _;
    }

    /// @notice The caller (doctor) must hold an active, non-expired,
    ///         non-revoked grant for the given patient + category.
    modifier onlyAuthorized(address _patient, RecordCategory _category) {
        require(
            hasActiveAccess(_patient, msg.sender, _category),
            "Access denied: no active grant for this category"
        );
        _;
    }

    // ──────────────────────────────────────────────
    //  Patient Registration
    // ──────────────────────────────────────────────

    /// @notice Register the caller as a patient.
    /// @param _name A human-readable display name (for the demo).
    function registerPatient(string calldata _name) external {
        require(!patients[msg.sender].exists, "Patient already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");

        patients[msg.sender] = Patient({
            name:      _name,
            createdAt: block.timestamp,
            exists:    true
        });

        emit PatientRegistered(msg.sender, _name, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  Record Management
    // ──────────────────────────────────────────────

    /// @notice A clinic/doctor adds a medical record for a patient.
    /// @dev    Anyone can call this (in the MVP the frontend enforces
    ///         that the caller is a clinic).  The patient can always
    ///         verify who added a record via `addedByClinic`.
    /// @param _patient     The patient's wallet address.
    /// @param _ipfsCID     IPFS content-identifier of the encrypted record.
    /// @param _category    The record category (determines who can read it).
    /// @param _recordType  Human-readable sub-type, e.g. "Consultation".
    function addRecord(
        address        _patient,
        string  calldata _ipfsCID,
        RecordCategory _category,
        string  calldata _recordType
    ) external patientExists(_patient) {
        require(bytes(_ipfsCID).length > 0,    "IPFS CID cannot be empty");
        require(bytes(_recordType).length > 0, "Record type cannot be empty");

        MedicalRecord memory record = MedicalRecord({
            ipfsCID:       _ipfsCID,
            category:      _category,
            recordType:    _recordType,
            addedByClinic: msg.sender,
            timestamp:     block.timestamp
        });

        _patientRecords[_patient].push(record);
        uint256 idx = _patientRecords[_patient].length - 1;

        // Audit
        _auditLog[_patient].push(AuditEntry({
            accessor:  msg.sender,
            category:  _category,
            timestamp: block.timestamp,
            action:    "RECORD_ADDED"
        }));

        emit RecordAdded(
            _patient,
            msg.sender,
            _category,
            _recordType,
            idx,
            block.timestamp
        );
    }

    // ──────────────────────────────────────────────
    //  Access Control
    // ──────────────────────────────────────────────

    /// @notice Patient grants a doctor time-limited access to ONE category.
    /// @param _doctor          The doctor's wallet address.
    /// @param _category        Which record category to share.
    /// @param _durationHours   How many hours the access lasts.
    function grantAccess(
        address        _doctor,
        RecordCategory _category,
        uint256        _durationHours
    ) external onlyPatient {
        require(_doctor != address(0),  "Invalid doctor address");
        require(_doctor != msg.sender,  "Cannot grant access to yourself");
        require(_durationHours > 0,     "Duration must be > 0");
        require(_durationHours <= 168,  "Duration cannot exceed 7 days");

        // Check if an existing grant already exists for this combo
        uint256 existingIdx = _grantIndex[msg.sender][_doctor][_category];
        if (existingIdx != 0) {
            // Overwrite: update the existing grant in place
            AccessGrant storage existing = _accessGrants[msg.sender][existingIdx - 1];
            existing.grantedAt = block.timestamp;
            existing.expiresAt = block.timestamp + (_durationHours * 1 hours);
            existing.revoked   = false;
        } else {
            // Create new grant
            AccessGrant memory grant = AccessGrant({
                doctor:    _doctor,
                category:  _category,
                grantedAt: block.timestamp,
                expiresAt: block.timestamp + (_durationHours * 1 hours),
                revoked:   false
            });
            _accessGrants[msg.sender].push(grant);
            // Store index+1 (so 0 remains the sentinel for "no grant")
            _grantIndex[msg.sender][_doctor][_category] =
                _accessGrants[msg.sender].length;
        }

        // Audit
        _auditLog[msg.sender].push(AuditEntry({
            accessor:  _doctor,
            category:  _category,
            timestamp: block.timestamp,
            action:    "ACCESS_GRANTED"
        }));

        emit AccessGranted(
            msg.sender,
            _doctor,
            _category,
            block.timestamp + (_durationHours * 1 hours),
            block.timestamp
        );
    }

    /// @notice Patient revokes a doctor's access to a specific category
    ///         before it naturally expires.
    /// @param _doctor   The doctor whose access to revoke.
    /// @param _category The category to revoke.
    function revokeAccess(
        address        _doctor,
        RecordCategory _category
    ) external onlyPatient {
        uint256 idx = _grantIndex[msg.sender][_doctor][_category];
        require(idx != 0, "No grant exists for this doctor/category");

        AccessGrant storage grant = _accessGrants[msg.sender][idx - 1];
        require(!grant.revoked, "Access already revoked");
        require(block.timestamp < grant.expiresAt, "Access already expired");

        grant.revoked = true;

        // Audit
        _auditLog[msg.sender].push(AuditEntry({
            accessor:  _doctor,
            category:  _category,
            timestamp: block.timestamp,
            action:    "ACCESS_REVOKED"
        }));

        emit AccessRevoked(msg.sender, _doctor, _category, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  Read Functions
    // ──────────────────────────────────────────────

    /// @notice Check whether `_doctor` currently has active access to
    ///         `_category` for `_patient`.
    /// @return True if an active, non-revoked, non-expired grant exists.
    function hasActiveAccess(
        address        _patient,
        address        _doctor,
        RecordCategory _category
    ) public view returns (bool) {
        uint256 idx = _grantIndex[_patient][_doctor][_category];
        if (idx == 0) return false;

        AccessGrant storage grant = _accessGrants[_patient][idx - 1];
        return !grant.revoked && block.timestamp < grant.expiresAt;
    }

    /// @notice Returns only the records in `_category` for the given patient.
    /// @dev    Caller must either be the patient themselves OR hold an
    ///         active grant for that category.  Emits AccessUsed when a
    ///         doctor reads records.
    /// @param _patient  The patient whose records to query.
    /// @param _category The category to filter by.
    /// @return filtered Array of MedicalRecord in the requested category.
    function getRecordsByCategory(
        address        _patient,
        RecordCategory _category
    )
        external
        patientExists(_patient)
        returns (MedicalRecord[] memory filtered)
    {
        bool isOwner = (msg.sender == _patient);

        if (!isOwner) {
            require(
                hasActiveAccess(_patient, msg.sender, _category),
                "Access denied: no active grant for this category"
            );
        }

        MedicalRecord[] storage all = _patientRecords[_patient];

        // First pass: count matches
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].category == _category) {
                count++;
            }
        }

        // Second pass: populate return array
        filtered = new MedicalRecord[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].category == _category) {
                filtered[j] = all[i];
                j++;
            }
        }

        // Audit (only when a doctor reads, not the patient themselves)
        if (!isOwner) {
            _auditLog[_patient].push(AuditEntry({
                accessor:  msg.sender,
                category:  _category,
                timestamp: block.timestamp,
                action:    "ACCESS_USED"
            }));

            emit AccessUsed(
                _patient,
                msg.sender,
                _category,
                count,
                block.timestamp
            );
        }

        return filtered;
    }

    /// @notice Returns ALL records for the calling patient (owner only).
    /// @dev    Only the patient themselves can call this.
    /// @return All MedicalRecord entries for msg.sender.
    function getMyRecords()
        external
        view
        onlyPatient
        returns (MedicalRecord[] memory)
    {
        return _patientRecords[msg.sender];
    }

    /// @notice Returns the total number of records a patient has.
    /// @param _patient The patient's address.
    /// @return The record count.
    function getRecordCount(address _patient)
        external
        view
        patientExists(_patient)
        returns (uint256)
    {
        return _patientRecords[_patient].length;
    }

    /// @notice Returns all access grants for the calling patient.
    /// @dev    Only the patient can view their own grants.
    /// @return All AccessGrant entries for msg.sender.
    function getMyAccessGrants()
        external
        view
        onlyPatient
        returns (AccessGrant[] memory)
    {
        return _accessGrants[msg.sender];
    }

    /// @notice Returns the full audit log for the calling patient.
    /// @dev    Only the patient can view their own audit log.
    /// @return All AuditEntry items for msg.sender.
    function getMyAuditLog()
        external
        view
        onlyPatient
        returns (AuditEntry[] memory)
    {
        return _auditLog[msg.sender];
    }

    /// @notice Convenience: returns grant details for a specific
    ///         patient + doctor + category combination.
    /// @param _patient  The patient's address.
    /// @param _doctor   The doctor's address.
    /// @param _category The record category.
    /// @return grant    The AccessGrant struct (zeroed if none exists).
    /// @return exists   Whether a grant was ever created.
    function getGrantDetails(
        address        _patient,
        address        _doctor,
        RecordCategory _category
    ) external view returns (AccessGrant memory grant, bool exists) {
        uint256 idx = _grantIndex[_patient][_doctor][_category];
        if (idx == 0) {
            return (grant, false);
        }
        return (_accessGrants[_patient][idx - 1], true);
    }
}
