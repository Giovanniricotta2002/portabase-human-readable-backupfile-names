import nodemailer from "nodemailer";
import { Server } from "./types";
import { Setting } from "@/db/schema/01_setting";

type SmtpSettings = Pick<Setting, "smtpHost" | "smtpPort" | "smtpUser" | "smtpPassword" | "smtpFrom">;

export const isSmtpConfigured = <T extends SmtpSettings>(
  settings?: T | null,
): settings is T & { [K in keyof SmtpSettings]: string } =>
  !!(
    settings?.smtpHost &&
    settings.smtpPort &&
    settings.smtpUser &&
    settings.smtpPassword &&
    settings.smtpFrom
  );

export const createTransporter = (server: Server) => {
  const portNumber = Number(server.port);
  return nodemailer.createTransport({
    pool: true,
    host: server.host,
    port: portNumber,
    secure: server.secure ?? portNumber === 465,
    auth: {
      user: server.user,
      pass: server.pass,
    },
  });
};
