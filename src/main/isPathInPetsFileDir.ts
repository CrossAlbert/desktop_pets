import path from "path";
import logger from 'electron-log';

export const isPathInPetsFileDir = (petsFileDir: string, targetPath: string) => {
  try {
    // 规范化路径，消除 .. 和 . 等相对路径符号
    const normalizedTarget = path.resolve(targetPath);
    const normalizedBase = path.resolve(petsFileDir);

    // 检查规范化后的目标路径是否以 petsFileDir 为前缀
    // path.join 用于确保目录分隔符一致，并处理跨平台问题
    return normalizedTarget.startsWith(normalizedBase + path.sep);
  } catch (error) {
    logger.error(error);
    // 如果路径无效或访问被拒绝等，视为不安全
    return false;
  }
}