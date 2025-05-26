// Auth swagger docs
export {
  LoginDocs,
  RegisterDocs,
  RefreshDocs,
  LogoutDocs,
  DebugGetAllUsersDocs,
  DebugAdminLoginDocs,
  DebugStudentLoginDocs,
  DebugTeacherLoginDocs,
} from './auth.swagger.docs';

// Users swagger docs
export {
  GetProfileDocs,
  CreateUserDocs,
  GetAllUsersDocs,
  GetUserByIdDocs,
  UpdateUserDocs,
  DeleteUserDocs,
} from './users.swagger.docs';

// Scheduling swagger docs
export {
  GenerateScheduleDocs,
  GetScheduleByIdDocs,
  GetAllSchedulesDocs,
  ActivateScheduleDocs,
  SearchSessionsDocs,
  GetGeneralScheduleDocs,
  GetTeacherScheduleDocs,
} from './scheduling.swagger.docs';
