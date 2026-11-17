import { Op, type CreationAttributes, type Transaction } from 'sequelize';
import { Session } from '../../database/index.js';

export const sessionRepository = {
  create: (data: CreationAttributes<Session>, transaction?: Transaction) =>
    Session.create(data, { transaction }),

  findByTokenHash: (tokenHash: string) => Session.findOne({ where: { tokenHash } }),

  update: (
    session: Session,
    data: Partial<CreationAttributes<Session>>,
    transaction?: Transaction,
  ) => session.update(data, { transaction }),

  destroy: (session: Session) => session.destroy(),

  destroyForUser: (userId: string, exceptSessionId?: string, transaction?: Transaction) =>
    Session.destroy({
      where: {
        userId,
        ...(exceptSessionId && { id: { [Op.ne]: exceptSessionId } }),
      },
      transaction,
    }),

  destroyExpired: () => Session.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } }),
};
