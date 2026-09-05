/**
 * EDUSPHERE — Enterprise Education CRM & Academic Management Platform
 * Unified Application Entry Point
 */

'use strict';

console.log('======================================================================');
console.log('🎓 EduSphere Enterprise Education Management Platform');
console.log('Environment: ' + (process.env.NODE_ENV || 'production'));
console.log('Version: 1.0.0');
console.log('======================================================================');

// Export core platform modules
const services = {
  StudentInformationService: require('./backend/src/services/student_information_service'),
  AttendanceBiometricService: require('./backend/src/services/attendance_biometric_service'),
  ExaminationAssessmentService: require('./backend/src/services/examination_assessment_service'),
  FeeBillingLedgerService: require('./backend/src/services/fee_billing_ledger_service'),
  TimetableSchedulingService: require('./backend/src/services/timetable_scheduling_service'),
  CurriculumLessonService: require('./backend/src/services/curriculum_lesson_service'),
  LibraryManagementService: require('./backend/src/services/library_management_service'),
  TransportFleetService: require('./backend/src/services/transport_fleet_service'),
  HostelFacilityService: require('./backend/src/services/hostel_facility_service'),
  HrFacultyPayrollService: require('./backend/src/services/hr_faculty_payroll_service'),
  CommunicationNotificationService: require('./backend/src/services/communication_notification_service'),
  AnalyticsComplianceService: require('./backend/src/services/analytics_compliance_service'),
  SecurityRbacService: require('./backend/src/services/security_rbac_service'),
  DataImportExportService: require('./backend/src/services/data_import_export_service'),
  CrmAdmissionsPipelineService: require('./backend/src/services/crm_admissions_pipeline_service'),
  InventoryAssetService: require('./backend/src/services/inventory_asset_service'),
  AlumniPlacementService: require('./backend/src/services/alumni_placement_service'),
  EventExtracurricularService: require('./backend/src/services/event_extracurricular_service'),
  HealthWellnessService: require('./backend/src/services/health_wellness_service'),
  ELearningContentService: require('./backend/src/services/e_learning_content_service')
};

function startServer(port = 4001) {
  process.env.PORT = String(port);
  const server = require('./backend/src/server');
  if (!server.listening) {
    server.listen(port, () => {
      console.log('EduSphere Core Backend API running on port ' + port + ' (http://127.0.0.1:' + port + ')');
    });
  }
  return server;
}

if (require.main === module) {
  startServer(process.env.PORT || 4001);
}

module.exports = {
  services,
  startServer
};
