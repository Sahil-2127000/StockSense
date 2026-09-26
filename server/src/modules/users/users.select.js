// Fields that are safe to return to clients (never passwordHash)
export const publicUserSelect = {
  id: true,
  loginId: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
};
