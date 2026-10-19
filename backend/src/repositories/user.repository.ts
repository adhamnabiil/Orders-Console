import { UserModel, type UserDocument, type UserRole } from "../models/user.model.js";

export const userRepository = {
  findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  },

  findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).exec();
  },

  async create(input: {
    email: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<UserDocument> {
    const user = await UserModel.create(input);
    return user;
  },

  async deleteAll(): Promise<void> {
    await UserModel.deleteMany({});
  },
};
