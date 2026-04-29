// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NetsanetCore
/// @author Nathaniel Abayneh (Woof Woof)
/// @notice Patient-owned medical records with category-based access control.
contract NetsanetCore {
    enum RecordCategory {
        GENERAL_CONSULTATION,
        HIV_TREATMENT,
        MENTAL_HEALTH,
        LAB_RESULT,
        PRESCRIPTION,
        PRENATAL_CARE,
        CHRONIC_DISEASE
    }

    enum AccessRequestStatus {
        NONE,
        PENDING,
        APPROVED,
        DECLINED
    }

    struct Patient {
        string name;
        uint256 createdAt;
        bool exists;
    }

    struct MedicalRecord {
        string ipfsCID;
        RecordCategory category;
        string recordType;
        address addedByClinic;
        uint256 timestamp;
    }

    struct AccessGrant {
        address doctor;
        RecordCategory category;
        uint256 grantedAt;
        uint256 expiresAt;
        bool revoked;
    }

    struct AccessRequest {
        address doctor;
        RecordCategory category;
        uint256 requestedAt;
        uint256 requestedDurationHours;
        uint256 respondedAt;
        AccessRequestStatus status;
    }

    struct AuditEntry {
        address accessor;
        RecordCategory category;
        uint256 timestamp;
        string action;
    }

    mapping(address => Patient) public patients;
    mapping(address => MedicalRecord[]) private _patientRecords;
    mapping(address => AccessGrant[]) private _accessGrants;
    mapping(address => AccessRequest[]) private _accessRequests;
    mapping(address => AuditEntry[]) private _auditLog;

    mapping(address => mapping(address => mapping(RecordCategory => uint256)))
        private _grantIndex;

    mapping(address => mapping(address => mapping(RecordCategory => uint256)))
        private _requestIndex;

    event PatientRegistered(
        address indexed patient,
        string name,
        uint256 timestamp
    );

    event RecordAdded(
        address indexed patient,
        address indexed clinic,
        RecordCategory category,
        string recordType,
        uint256 recordIndex,
        uint256 timestamp
    );

    event AccessGranted(
        address indexed patient,
        address indexed doctor,
        RecordCategory category,
        uint256 expiresAt,
        uint256 timestamp
    );

    event AccessRevoked(
        address indexed patient,
        address indexed doctor,
        RecordCategory category,
        uint256 timestamp
    );

    event AccessUsed(
        address indexed patient,
        address indexed doctor,
        RecordCategory category,
        uint256 recordCount,
        uint256 timestamp
    );

    event AccessRequested(
        address indexed patient,
        address indexed doctor,
        RecordCategory category,
        uint256 durationHours,
        uint256 timestamp
    );

    event AccessRequestResponded(
        address indexed patient,
        address indexed doctor,
        RecordCategory category,
        uint256 durationHours,
        bool approved,
        uint256 timestamp
    );

    modifier onlyPatient() {
        require(patients[msg.sender].exists, "Not a registered patient");
        _;
    }

    modifier patientExists(address _patient) {
        require(patients[_patient].exists, "Patient does not exist");
        _;
    }

    function registerPatient(string calldata _name) external {
        require(!patients[msg.sender].exists, "Patient already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");

        patients[msg.sender] = Patient({
            name: _name,
            createdAt: block.timestamp,
            exists: true
        });

        emit PatientRegistered(msg.sender, _name, block.timestamp);
    }

    function addRecord(
        address _patient,
        string calldata _ipfsCID,
        RecordCategory _category,
        string calldata _recordType
    ) external patientExists(_patient) {
        require(bytes(_ipfsCID).length > 0, "IPFS CID cannot be empty");
        require(bytes(_recordType).length > 0, "Record type cannot be empty");

        MedicalRecord memory record = MedicalRecord({
            ipfsCID: _ipfsCID,
            category: _category,
            recordType: _recordType,
            addedByClinic: msg.sender,
            timestamp: block.timestamp
        });

        _patientRecords[_patient].push(record);
        uint256 idx = _patientRecords[_patient].length - 1;

        _auditLog[_patient].push(AuditEntry({
            accessor: msg.sender,
            category: _category,
            timestamp: block.timestamp,
            action: "RECORD_ADDED"
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

    function _validateGrantInputs(
        address _patient,
        address _doctor,
        uint256 _durationHours
    ) internal pure {
        require(_doctor != address(0), "Invalid doctor address");
        require(_doctor != _patient, "Cannot grant access to yourself");
        require(_durationHours > 0, "Duration must be > 0");
        require(_durationHours <= 168, "Duration cannot exceed 7 days");
    }

    function _grantAccessInternal(
        address _patient,
        address _doctor,
        RecordCategory _category,
        uint256 _durationHours
    ) internal {
        _validateGrantInputs(_patient, _doctor, _durationHours);

        uint256 expiresAt = block.timestamp + (_durationHours * 1 hours);
        uint256 existingIdx = _grantIndex[_patient][_doctor][_category];

        if (existingIdx != 0) {
            AccessGrant storage existing = _accessGrants[_patient][existingIdx - 1];
            existing.grantedAt = block.timestamp;
            existing.expiresAt = expiresAt;
            existing.revoked = false;
        } else {
            AccessGrant memory grant = AccessGrant({
                doctor: _doctor,
                category: _category,
                grantedAt: block.timestamp,
                expiresAt: expiresAt,
                revoked: false
            });

            _accessGrants[_patient].push(grant);
            _grantIndex[_patient][_doctor][_category] =
                _accessGrants[_patient].length;
        }

        _auditLog[_patient].push(AuditEntry({
            accessor: _doctor,
            category: _category,
            timestamp: block.timestamp,
            action: "ACCESS_GRANTED"
        }));

        emit AccessGranted(
            _patient,
            _doctor,
            _category,
            expiresAt,
            block.timestamp
        );
    }

    function _syncRequestApprovalIfNeeded(
        address _patient,
        address _doctor,
        RecordCategory _category,
        uint256 _durationHours
    ) internal {
        uint256 requestIdx = _requestIndex[_patient][_doctor][_category];
        if (requestIdx == 0) {
            return;
        }

        AccessRequest storage request = _accessRequests[_patient][requestIdx - 1];
        if (request.status == AccessRequestStatus.APPROVED) {
            return;
        }

        request.requestedDurationHours = _durationHours;
        request.respondedAt = block.timestamp;
        request.status = AccessRequestStatus.APPROVED;

        emit AccessRequestResponded(
            _patient,
            _doctor,
            _category,
            _durationHours,
            true,
            block.timestamp
        );
    }

    function grantAccess(
        address _doctor,
        RecordCategory _category,
        uint256 _durationHours
    ) external onlyPatient {
        _grantAccessInternal(msg.sender, _doctor, _category, _durationHours);
        _syncRequestApprovalIfNeeded(
            msg.sender,
            _doctor,
            _category,
            _durationHours
        );
    }

    function requestAccess(
        address _patient,
        RecordCategory _category,
        uint256 _durationHours
    ) external patientExists(_patient) {
        _validateGrantInputs(_patient, msg.sender, _durationHours);
        require(
            !hasActiveAccess(_patient, msg.sender, _category),
            "Access already active for this category"
        );

        uint256 requestIdx = _requestIndex[_patient][msg.sender][_category];

        if (requestIdx != 0) {
            AccessRequest storage existing = _accessRequests[_patient][requestIdx - 1];
            require(
                existing.status != AccessRequestStatus.PENDING,
                "Access request already pending"
            );

            existing.requestedAt = block.timestamp;
            existing.requestedDurationHours = _durationHours;
            existing.respondedAt = 0;
            existing.status = AccessRequestStatus.PENDING;
        } else {
            AccessRequest memory request = AccessRequest({
                doctor: msg.sender,
                category: _category,
                requestedAt: block.timestamp,
                requestedDurationHours: _durationHours,
                respondedAt: 0,
                status: AccessRequestStatus.PENDING
            });

            _accessRequests[_patient].push(request);
            _requestIndex[_patient][msg.sender][_category] =
                _accessRequests[_patient].length;
        }

        _auditLog[_patient].push(AuditEntry({
            accessor: msg.sender,
            category: _category,
            timestamp: block.timestamp,
            action: "ACCESS_REQUESTED"
        }));

        emit AccessRequested(
            _patient,
            msg.sender,
            _category,
            _durationHours,
            block.timestamp
        );
    }

    function respondToAccessRequest(
        address _doctor,
        RecordCategory _category,
        bool _approve
    ) external onlyPatient {
        uint256 requestIdx = _requestIndex[msg.sender][_doctor][_category];
        require(
            requestIdx != 0,
            "No access request exists for this doctor/category"
        );

        AccessRequest storage request = _accessRequests[msg.sender][requestIdx - 1];
        require(
            request.status == AccessRequestStatus.PENDING,
            "Access request is not pending"
        );

        request.respondedAt = block.timestamp;

        if (_approve) {
            request.status = AccessRequestStatus.APPROVED;

            emit AccessRequestResponded(
                msg.sender,
                _doctor,
                _category,
                request.requestedDurationHours,
                true,
                block.timestamp
            );

            _grantAccessInternal(
                msg.sender,
                _doctor,
                _category,
                request.requestedDurationHours
            );
        } else {
            request.status = AccessRequestStatus.DECLINED;

            _auditLog[msg.sender].push(AuditEntry({
                accessor: _doctor,
                category: _category,
                timestamp: block.timestamp,
                action: "ACCESS_REQUEST_DECLINED"
            }));

            emit AccessRequestResponded(
                msg.sender,
                _doctor,
                _category,
                request.requestedDurationHours,
                false,
                block.timestamp
            );
        }
    }

    function revokeAccess(
        address _doctor,
        RecordCategory _category
    ) external onlyPatient {
        uint256 idx = _grantIndex[msg.sender][_doctor][_category];
        require(idx != 0, "No grant exists for this doctor/category");

        AccessGrant storage grant = _accessGrants[msg.sender][idx - 1];
        require(!grant.revoked, "Access already revoked");
        require(block.timestamp < grant.expiresAt, "Access already expired");

        grant.revoked = true;

        _auditLog[msg.sender].push(AuditEntry({
            accessor: _doctor,
            category: _category,
            timestamp: block.timestamp,
            action: "ACCESS_REVOKED"
        }));

        emit AccessRevoked(msg.sender, _doctor, _category, block.timestamp);
    }

    function hasActiveAccess(
        address _patient,
        address _doctor,
        RecordCategory _category
    ) public view returns (bool) {
        uint256 idx = _grantIndex[_patient][_doctor][_category];
        if (idx == 0) {
            return false;
        }

        AccessGrant storage grant = _accessGrants[_patient][idx - 1];
        return !grant.revoked && block.timestamp < grant.expiresAt;
    }

    function getRecordsByCategory(
        address _patient,
        RecordCategory _category
    )
        external
        patientExists(_patient)
        returns (MedicalRecord[] memory filtered)
    {
        bool isOwner = msg.sender == _patient;

        if (!isOwner) {
            require(
                hasActiveAccess(_patient, msg.sender, _category),
                "Access denied: no active grant for this category"
            );
        }

        MedicalRecord[] storage all = _patientRecords[_patient];

        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].category == _category) {
                count++;
            }
        }

        filtered = new MedicalRecord[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].category == _category) {
                filtered[j] = all[i];
                j++;
            }
        }

        if (!isOwner) {
            _auditLog[_patient].push(AuditEntry({
                accessor: msg.sender,
                category: _category,
                timestamp: block.timestamp,
                action: "ACCESS_USED"
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

    function getMyRecords()
        external
        view
        onlyPatient
        returns (MedicalRecord[] memory)
    {
        return _patientRecords[msg.sender];
    }

    function getRecordCount(address _patient)
        external
        view
        patientExists(_patient)
        returns (uint256)
    {
        return _patientRecords[_patient].length;
    }

    function getMyAccessGrants()
        external
        view
        onlyPatient
        returns (AccessGrant[] memory)
    {
        return _accessGrants[msg.sender];
    }

    function getMyPendingAccessRequests()
        external
        view
        onlyPatient
        returns (AccessRequest[] memory pending)
    {
        AccessRequest[] storage all = _accessRequests[msg.sender];

        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].status == AccessRequestStatus.PENDING) {
                count++;
            }
        }

        pending = new AccessRequest[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].status == AccessRequestStatus.PENDING) {
                pending[j] = all[i];
                j++;
            }
        }

        return pending;
    }

    function getMyAuditLog()
        external
        view
        onlyPatient
        returns (AuditEntry[] memory)
    {
        return _auditLog[msg.sender];
    }

    function getGrantDetails(
        address _patient,
        address _doctor,
        RecordCategory _category
    ) external view returns (AccessGrant memory grant, bool exists) {
        uint256 idx = _grantIndex[_patient][_doctor][_category];
        if (idx == 0) {
            return (grant, false);
        }

        return (_accessGrants[_patient][idx - 1], true);
    }

    function getAccessRequestDetails(
        address _patient,
        address _doctor,
        RecordCategory _category
    ) external view returns (AccessRequest memory request, bool exists) {
        uint256 idx = _requestIndex[_patient][_doctor][_category];
        if (idx == 0) {
            return (request, false);
        }

        return (_accessRequests[_patient][idx - 1], true);
    }
}
