// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/NetsanetCore.sol";

/// @title NetsanetCoreTest — Full test suite for the Netsanet smart contract
/// @dev   Covers happy paths, edge cases, access control, expiry, revocation,
///        selective category enforcement, and audit logging.
contract NetsanetCoreTest is Test {

    NetsanetCore public core;

    // Test addresses
    address public patient1 = makeAddr("patient_selam");
    address public patient2 = makeAddr("patient_dawit");
    address public doctor1  = makeAddr("doctor_yonas");
    address public doctor2  = makeAddr("doctor_clinic_tikur_anbessa");
    address public clinic   = makeAddr("msfBoleClinic");

    // ──────────────────────────────────────────────
    //  Setup
    // ──────────────────────────────────────────────

    // Events (redeclared to test with vm.expectEmit)
    event PatientRegistered(address indexed patient, string name, uint256 timestamp);
    
    event RecordAdded(
        address indexed patient,
        address indexed clinic,
        NetsanetCore.RecordCategory category,
        string recordType,
        uint256 recordIndex,
        uint256 timestamp
    );
    
    event AccessGranted(
        address indexed patient,
        address indexed doctor,
        NetsanetCore.RecordCategory category,
        uint256 expiresAt,
        uint256 timestamp
    );
    
    event AccessRevoked(
        address indexed patient,
        address indexed doctor,
        NetsanetCore.RecordCategory category,
        uint256 timestamp
    );

    function setUp() public {
        core = new NetsanetCore();
    }

    // ──────────────────────────────────────────────
    //  Patient Registration
    // ──────────────────────────────────────────────

    function test_RegisterPatient() public {
        vm.prank(patient1);
        core.registerPatient("Selam Tadesse");

        (string memory name, uint256 createdAt, bool exists) = core.patients(patient1);
        assertEq(name, "Selam Tadesse");
        assertTrue(exists);
        assertGt(createdAt, 0);
    }

    function test_RevertDoubleRegistration() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectRevert("Patient already registered");
        core.registerPatient("Selam Again");
    }

    function test_RevertEmptyName() public {
        vm.prank(patient1);
        vm.expectRevert("Name cannot be empty");
        core.registerPatient("");
    }

    // ──────────────────────────────────────────────
    //  Record Management
    // ──────────────────────────────────────────────

    function test_AddRecord() public {
        // Register patient first
        vm.prank(patient1);
        core.registerPatient("Selam");

        // Clinic adds a record
        vm.prank(clinic);
        core.addRecord(
            patient1,
            "QmHIVrecord123abc",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "CD4 Count Report"
        );

        // Verify record count
        assertEq(core.getRecordCount(patient1), 1);
    }

    function test_AddMultipleRecordsDifferentCategories() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        // Add HIV record
        vm.prank(clinic);
        core.addRecord(
            patient1,
            "QmHIVrecord123",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "ART Regimen"
        );

        // Add Mental Health record
        vm.prank(doctor1);
        core.addRecord(
            patient1,
            "QmMentalHealth456",
            NetsanetCore.RecordCategory.MENTAL_HEALTH,
            "Counseling Session"
        );

        // Add General Consultation
        vm.prank(doctor2);
        core.addRecord(
            patient1,
            "QmGeneralConsult789",
            NetsanetCore.RecordCategory.GENERAL_CONSULTATION,
            "Routine Checkup"
        );

        assertEq(core.getRecordCount(patient1), 3);
    }

    function test_RevertAddRecordUnregisteredPatient() public {
        vm.prank(clinic);
        vm.expectRevert("Patient does not exist");
        core.addRecord(
            patient1,
            "QmSomeCID",
            NetsanetCore.RecordCategory.GENERAL_CONSULTATION,
            "Checkup"
        );
    }

    function test_RevertAddRecordEmptyCID() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        vm.expectRevert("IPFS CID cannot be empty");
        core.addRecord(
            patient1,
            "",
            NetsanetCore.RecordCategory.GENERAL_CONSULTATION,
            "Checkup"
        );
    }

    function test_RevertAddRecordEmptyType() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        vm.expectRevert("Record type cannot be empty");
        core.addRecord(
            patient1,
            "QmSomeCID",
            NetsanetCore.RecordCategory.GENERAL_CONSULTATION,
            ""
        );
    }

    // Patient can see all their own records
    function test_GetMyRecords() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(patient1, "QmCID1", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");

        vm.prank(doctor1);
        core.addRecord(patient1, "QmCID2", NetsanetCore.RecordCategory.MENTAL_HEALTH, "Therapy");

        vm.prank(patient1);
        NetsanetCore.MedicalRecord[] memory records = core.getMyRecords();
        assertEq(records.length, 2);
        assertEq(records[0].ipfsCID, "QmCID1");
        assertEq(records[1].ipfsCID, "QmCID2");
    }

    // ──────────────────────────────────────────────
    //  Access Control — Granting
    // ──────────────────────────────────────────────

    function test_GrantAccess() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(
            doctor1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6  // 6 hours
        );

        assertTrue(
            core.hasActiveAccess(
                patient1,
                doctor1,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            )
        );
    }

    function test_RevertGrantAccessNotPatient() public {
        // doctor1 is not a registered patient
        vm.prank(doctor1);
        vm.expectRevert("Not a registered patient");
        core.grantAccess(
            doctor2,
            NetsanetCore.RecordCategory.GENERAL_CONSULTATION,
            6
        );
    }

    function test_RevertGrantAccessToSelf() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectRevert("Cannot grant access to yourself");
        core.grantAccess(
            patient1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6
        );
    }

    function test_RevertGrantAccessZeroDuration() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectRevert("Duration must be > 0");
        core.grantAccess(
            doctor1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            0
        );
    }

    function test_RevertGrantAccessExcessiveDuration() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectRevert("Duration cannot exceed 7 days");
        core.grantAccess(
            doctor1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            200  // > 168 hours
        );
    }

    function test_OverwriteExistingGrant() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        // Grant for 2 hours
        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 2);

        // Overwrite with 6 hours
        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        // Should still have access — and it should be the 6-hour grant
        assertTrue(
            core.hasActiveAccess(
                patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT
            )
        );

        // Verify grant details
        (NetsanetCore.AccessGrant memory grant, bool exists) =
            core.getGrantDetails(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);
        assertTrue(exists);
        assertEq(grant.expiresAt, grant.grantedAt + 6 hours);
    }

    // ──────────────────────────────────────────────
    //  Access Control — Expiry
    // ──────────────────────────────────────────────

    function test_AccessExpiresAfterDuration() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        // Active now
        assertTrue(
            core.hasActiveAccess(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );

        // Fast-forward 7 hours — past the 6-hour grant
        vm.warp(block.timestamp + 7 hours);

        // Should be expired now
        assertFalse(
            core.hasActiveAccess(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );
    }

    function test_AccessActiveJustBeforeExpiry() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        // Fast-forward to 5 hours 59 minutes — should still be active
        vm.warp(block.timestamp + 5 hours + 59 minutes);

        assertTrue(
            core.hasActiveAccess(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );
    }

    // ──────────────────────────────────────────────
    //  Access Control — Revocation
    // ──────────────────────────────────────────────

    function test_RevokeAccess() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        // Verify active
        assertTrue(
            core.hasActiveAccess(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );

        // Revoke
        vm.prank(patient1);
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        // No longer active
        assertFalse(
            core.hasActiveAccess(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );
    }

    function test_RevertRevokeNonexistentGrant() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectRevert("No grant exists for this doctor/category");
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);
    }

    function test_RevertDoubleRevoke() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        vm.prank(patient1);
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        vm.prank(patient1);
        vm.expectRevert("Access already revoked");
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);
    }

    function test_RevertRevokeExpiredAccess() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 1);

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);

        vm.prank(patient1);
        vm.expectRevert("Access already expired");
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);
    }

    // ──────────────────────────────────────────────
    //  SELECTIVE ACCESS — The "Wow Moment"
    //  Doctor with HIV access CANNOT see Mental Health records.
    // ──────────────────────────────────────────────

    function test_SelectiveAccess_DoctorCanOnlySeeGrantedCategory() public {
        // Setup: Register Selam with 2 records in different categories
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(
            patient1,
            "QmHIV_CD4_Count_2024",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "CD4 Count Report"
        );

        vm.prank(doctor1);
        core.addRecord(
            patient1,
            "QmMentalHealth_Counseling_Session",
            NetsanetCore.RecordCategory.MENTAL_HEALTH,
            "Counseling Session Notes"
        );

        // Patient grants doctor2 access ONLY to HIV_TREATMENT
        vm.prank(patient1);
        core.grantAccess(
            doctor2,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6
        );

        // Doctor2 reads HIV records — should succeed, return 1 record
        vm.prank(doctor2);
        NetsanetCore.MedicalRecord[] memory hivRecords =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        assertEq(hivRecords.length, 1);
        assertEq(hivRecords[0].ipfsCID, "QmHIV_CD4_Count_2024");

        // Doctor2 tries to read MENTAL_HEALTH — should REVERT
        vm.prank(doctor2);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.MENTAL_HEALTH);
    }

    function test_SelectiveAccess_PatientCanSeeAllCategories() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(patient1, "QmHIV", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");

        vm.prank(doctor1);
        core.addRecord(patient1, "QmMental", NetsanetCore.RecordCategory.MENTAL_HEALTH, "Therapy");

        // Patient can see their own records in any category without grants
        vm.prank(patient1);
        NetsanetCore.MedicalRecord[] memory hivRecords =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);
        assertEq(hivRecords.length, 1);

        vm.prank(patient1);
        NetsanetCore.MedicalRecord[] memory mentalRecords =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.MENTAL_HEALTH);
        assertEq(mentalRecords.length, 1);
    }

    function test_SelectiveAccess_TwoDoctorsDifferentCategories() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(patient1, "QmHIV1", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");

        vm.prank(clinic);
        core.addRecord(patient1, "QmMH1", NetsanetCore.RecordCategory.MENTAL_HEALTH, "Session");

        // Grant doctor1 → HIV, doctor2 → MENTAL_HEALTH
        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        vm.prank(patient1);
        core.grantAccess(doctor2, NetsanetCore.RecordCategory.MENTAL_HEALTH, 6);

        // doctor1 can read HIV but NOT mental health
        vm.prank(doctor1);
        NetsanetCore.MedicalRecord[] memory d1HIV =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);
        assertEq(d1HIV.length, 1);

        vm.prank(doctor1);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.MENTAL_HEALTH);

        // doctor2 can read mental health but NOT HIV
        vm.prank(doctor2);
        NetsanetCore.MedicalRecord[] memory d2MH =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.MENTAL_HEALTH);
        assertEq(d2MH.length, 1);

        vm.prank(doctor2);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);
    }

    // ──────────────────────────────────────────────
    //  Audit Log
    // ──────────────────────────────────────────────

    function test_AuditLogTracksRecordAddition() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(patient1, "QmCID", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");

        vm.prank(patient1);
        NetsanetCore.AuditEntry[] memory log = core.getMyAuditLog();
        assertEq(log.length, 1);
        assertEq(log[0].accessor, clinic);
        assertEq(log[0].action, "RECORD_ADDED");
    }

    function test_AuditLogTracksGrantAndRevoke() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        vm.prank(patient1);
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        vm.prank(patient1);
        NetsanetCore.AuditEntry[] memory log = core.getMyAuditLog();
        assertEq(log.length, 2);
        assertEq(log[0].action, "ACCESS_GRANTED");
        assertEq(log[1].action, "ACCESS_REVOKED");
    }

    function test_AuditLogTracksAccessUsed() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        core.addRecord(patient1, "QmHIV", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        // Doctor reads records
        vm.prank(doctor1);
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        // Audit log should show: RECORD_ADDED, ACCESS_GRANTED, ACCESS_USED
        vm.prank(patient1);
        NetsanetCore.AuditEntry[] memory log = core.getMyAuditLog();
        assertEq(log.length, 3);
        assertEq(log[2].action, "ACCESS_USED");
        assertEq(log[2].accessor, doctor1);
    }

    // ──────────────────────────────────────────────
    //  Grant Details
    // ──────────────────────────────────────────────

    function test_GetGrantDetails() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        (NetsanetCore.AccessGrant memory grant, bool exists) =
            core.getGrantDetails(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        assertTrue(exists);
        assertEq(grant.doctor, doctor1);
        assertFalse(grant.revoked);
    }

    function test_GetGrantDetailsNonexistent() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        (, bool exists) =
            core.getGrantDetails(patient1, doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        assertFalse(exists);
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    function test_EmitPatientRegistered() public {
        vm.prank(patient1);
        vm.expectEmit(true, false, false, true);
        emit PatientRegistered(patient1, "Selam", block.timestamp);
        core.registerPatient("Selam");
    }

    function test_EmitRecordAdded() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(clinic);
        vm.expectEmit(true, true, false, true);
        emit RecordAdded(
            patient1,
            clinic,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "ART",
            0,
            block.timestamp
        );
        core.addRecord(patient1, "QmCID", NetsanetCore.RecordCategory.HIV_TREATMENT, "ART");
    }

    function test_EmitAccessGranted() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        vm.expectEmit(true, true, false, true);
        emit AccessGranted(
            patient1,
            doctor1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            block.timestamp + 6 hours,
            block.timestamp
        );
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);
    }

    function test_EmitAccessRevoked() public {
        vm.prank(patient1);
        core.registerPatient("Selam");

        vm.prank(patient1);
        core.grantAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT, 6);

        vm.prank(patient1);
        vm.expectEmit(true, true, false, true);
        emit AccessRevoked(
            patient1,
            doctor1,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            block.timestamp
        );
        core.revokeAccess(doctor1, NetsanetCore.RecordCategory.HIV_TREATMENT);
    }

    // ──────────────────────────────────────────────
    //  Full Demo Scenario: Selam's Story
    // ──────────────────────────────────────────────

    /// @notice End-to-end demo: Selam registers, gets records from MSF,
    ///         then visits Tikur Anbessa. Doctor requests HIV access,
    ///         can see HIV records but NOT mental health records.
    function test_FullDemoScenario_SelamStory() public {
        // ---- 1. Selam registers ----
        vm.prank(patient1);
        core.registerPatient("Selam Tadesse");

        // ---- 2. MSF Bole Clinic adds HIV records ----
        vm.prank(clinic);
        core.addRecord(
            patient1,
            "QmEncryptedHIV_CD4Count_2024",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "CD4 Count - 650 cells/mm3"
        );

        vm.prank(clinic);
        core.addRecord(
            patient1,
            "QmEncryptedHIV_ART_Regimen",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "ART Regimen - TDF/3TC/DTG"
        );

        // ---- 3. Private therapist adds mental health record ----
        vm.prank(doctor1);
        core.addRecord(
            patient1,
            "QmEncryptedMentalHealth_Session",
            NetsanetCore.RecordCategory.MENTAL_HEALTH,
            "Counseling - Anxiety Management"
        );

        // ---- 4. Selam now has 3 records (2 HIV, 1 Mental Health) ----
        assertEq(core.getRecordCount(patient1), 3);

        // ---- 5. MSF closes. Selam goes to Tikur Anbessa. ----
        //         Doctor2 (Tikur Anbessa) scans QR, requests HIV access.
        //         Selam grants 6-hour access to HIV_TREATMENT only.
        vm.prank(patient1);
        core.grantAccess(
            doctor2,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6
        );

        // ---- 6. Doctor sees HIV records ----
        vm.prank(doctor2);
        NetsanetCore.MedicalRecord[] memory hivRecords =
            core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        assertEq(hivRecords.length, 2);
        assertEq(hivRecords[0].ipfsCID, "QmEncryptedHIV_CD4Count_2024");
        assertEq(hivRecords[1].ipfsCID, "QmEncryptedHIV_ART_Regimen");

        // ---- 7. Doctor tries mental health → BLOCKED ----
        vm.prank(doctor2);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.MENTAL_HEALTH);

        // ---- 8. Doctor adds new consultation record ----
        vm.prank(doctor2);
        core.addRecord(
            patient1,
            "QmEncryptedHIV_NewConsultation_TikurAnbessa",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "Consultation - Medication Adjustment"
        );

        assertEq(core.getRecordCount(patient1), 4);

        // ---- 9. Time passes, access expires ----
        vm.warp(block.timestamp + 7 hours);

        assertFalse(
            core.hasActiveAccess(patient1, doctor2, NetsanetCore.RecordCategory.HIV_TREATMENT)
        );

        // Doctor tries to read again → BLOCKED (expired)
        vm.prank(doctor2);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(patient1, NetsanetCore.RecordCategory.HIV_TREATMENT);

        // ---- 10. Selam checks her audit log ----
        vm.prank(patient1);
        NetsanetCore.AuditEntry[] memory log = core.getMyAuditLog();

        // Expected log entries:
        // [0] RECORD_ADDED (HIV CD4) by clinic
        // [1] RECORD_ADDED (HIV ART) by clinic
        // [2] RECORD_ADDED (Mental Health) by doctor1
        // [3] ACCESS_GRANTED (HIV) to doctor2
        // [4] ACCESS_USED (HIV) by doctor2
        // [5] RECORD_ADDED (new consultation) by doctor2
        assertEq(log.length, 6);
        assertEq(log[0].action, "RECORD_ADDED");
        assertEq(log[3].action, "ACCESS_GRANTED");
        assertEq(log[4].action, "ACCESS_USED");
        assertEq(log[4].accessor, doctor2);
    }
}
