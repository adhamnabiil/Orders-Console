import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(mongoUrl = env.MONGO_URL): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  return mongoose.connect(mongoUrl);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
