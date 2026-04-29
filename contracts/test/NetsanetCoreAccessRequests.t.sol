// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/NetsanetCore.sol";

contract NetsanetCoreAccessRequestsTest is Test {
    NetsanetCore public core;

    address public patient = makeAddr("patient_selam");
    address public doctor = makeAddr("doctor_yonas");
    address public clinic = makeAddr("msf_bole_clinic");

    function setUp() public {
        core = new NetsanetCore();

        vm.prank(patient);
        core.registerPatient("Selam Tadesse");
    }

    function _requestHivAccess(uint256 durationHours) internal {
        vm.prank(doctor);
        core.requestAccess(
            patient,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            durationHours
        );
    }

    function test_RequestAccessCreatesPendingRequest() public {
        _requestHivAccess(12);

        vm.prank(patient);
        NetsanetCore.AccessRequest[] memory pending =
            core.getMyPendingAccessRequests();

        assertEq(pending.length, 1);
        assertEq(pending[0].doctor, doctor);
        assertEq(
            uint256(pending[0].category),
            uint256(NetsanetCore.RecordCategory.HIV_TREATMENT)
        );
        assertEq(pending[0].requestedDurationHours, 12);
        assertEq(
            uint256(pending[0].status),
            uint256(NetsanetCore.AccessRequestStatus.PENDING)
        );
    }

    function test_RevertDuplicatePendingRequest() public {
        _requestHivAccess(12);

        vm.prank(doctor);
        vm.expectRevert("Access request already pending");
        core.requestAccess(
            patient,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            12
        );
    }

    function test_ApproveRequestGrantsAccess() public {
        _requestHivAccess(6);

        vm.prank(patient);
        core.respondToAccessRequest(
            doctor,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            true
        );

        assertTrue(
            core.hasActiveAccess(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            )
        );

        (NetsanetCore.AccessRequest memory request, bool exists) =
            core.getAccessRequestDetails(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            );

        assertTrue(exists);
        assertEq(
            uint256(request.status),
            uint256(NetsanetCore.AccessRequestStatus.APPROVED)
        );
        assertGt(request.respondedAt, 0);

        vm.prank(patient);
        NetsanetCore.AccessRequest[] memory pending =
            core.getMyPendingAccessRequests();
        assertEq(pending.length, 0);
    }

    function test_DeclineRequestKeepsAccessInactive() public {
        _requestHivAccess(24);

        vm.prank(patient);
        core.respondToAccessRequest(
            doctor,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            false
        );

        assertFalse(
            core.hasActiveAccess(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            )
        );

        (NetsanetCore.AccessRequest memory request, bool exists) =
            core.getAccessRequestDetails(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            );

        assertTrue(exists);
        assertEq(
            uint256(request.status),
            uint256(NetsanetCore.AccessRequestStatus.DECLINED)
        );
        assertGt(request.respondedAt, 0);
    }

    function test_DoctorCannotReadRecordsWhileRequestIsPending() public {
        vm.prank(clinic);
        core.addRecord(
            patient,
            "QmEncryptedHivRecord",
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            "ART Follow-Up"
        );

        _requestHivAccess(8);

        vm.prank(doctor);
        vm.expectRevert("Access denied: no active grant for this category");
        core.getRecordsByCategory(
            patient,
            NetsanetCore.RecordCategory.HIV_TREATMENT
        );
    }

    function test_ManualGrantResolvesMatchingPendingRequest() public {
        _requestHivAccess(12);

        vm.prank(patient);
        core.grantAccess(
            doctor,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            24
        );

        assertTrue(
            core.hasActiveAccess(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            )
        );

        (NetsanetCore.AccessRequest memory request, bool exists) =
            core.getAccessRequestDetails(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            );

        assertTrue(exists);
        assertEq(
            uint256(request.status),
            uint256(NetsanetCore.AccessRequestStatus.APPROVED)
        );
        assertEq(request.requestedDurationHours, 24);
    }

    function test_RevertRequestWhenAccessAlreadyActive() public {
        vm.prank(patient);
        core.grantAccess(
            doctor,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6
        );

        vm.prank(doctor);
        vm.expectRevert("Access already active for this category");
        core.requestAccess(
            patient,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            6
        );
    }

    function test_DoctorCanRequestAgainAfterDecline() public {
        _requestHivAccess(6);

        vm.prank(patient);
        core.respondToAccessRequest(
            doctor,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            false
        );

        vm.prank(doctor);
        core.requestAccess(
            patient,
            NetsanetCore.RecordCategory.HIV_TREATMENT,
            18
        );

        (NetsanetCore.AccessRequest memory request, bool exists) =
            core.getAccessRequestDetails(
                patient,
                doctor,
                NetsanetCore.RecordCategory.HIV_TREATMENT
            );

        assertTrue(exists);
        assertEq(request.requestedDurationHours, 18);
        assertEq(
            uint256(request.status),
            uint256(NetsanetCore.AccessRequestStatus.PENDING)
        );
        assertEq(request.respondedAt, 0);
    }
}
