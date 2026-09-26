import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { hashPassword } from './auth.service.js';
import { signAuthToken } from '../utils/token.js';
import { publicUserSelect } from '../utils/userSelect.js';

const findUserOr404 = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const getProfile = (userId) => findUserOr404(userId);

export const updateProfile = async (userId, { fullName, email }) => {
  if (email) {
    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (taken) {
      throw ApiError.conflict('Email already registered', [
        { field: 'email', message: 'Email already registered' },
      ]);
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { fullName, email },
    select: publicUserSelect,
  });
};

export const changePassword = async (userId, { currentPassword, password }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }
  // Other sessions are logged out (their token fingerprint no longer matches); return a fresh token for this one
  const updated = await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  return signAuthToken(updated);
};

export const listUsers = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.role && { role: query.role }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.q && {
      OR: [
        { loginId: { contains: query.q } },
        { fullName: { contains: query.q } },
        { email: { contains: query.q } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: publicUserSelect, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.user.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

export const updateUser = async (actorId, id, { role, isActive }) => {
  await findUserOr404(id);
  // A manager must not lock themselves out
  if (id === actorId && (role === 'STAFF' || isActive === false)) {
    throw ApiError.badRequest('You cannot demote or deactivate your own account');
  }
  return prisma.user.update({ where: { id }, data: { role, isActive }, select: publicUserSelect });
};
