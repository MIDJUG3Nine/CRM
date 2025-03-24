/**
 * 数据库备份脚本
 * 用于定期备份MySQL数据库并上传到远程存储
 * 使用方法：node -r ts-node/register scripts/backup.ts
 */
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// 将exec转换为Promise
const execAsync = util.promisify(exec);

// 备份配置
const config = {
  // 数据库配置
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || '3306',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || '',
  },
  // 备份路径
  backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
  // 备份保留天数
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  // 远程存储配置
  remoteStorage: {
    enabled: process.env.REMOTE_STORAGE_ENABLED === 'true',
    type: process.env.REMOTE_STORAGE_TYPE || 's3', // 's3', 'gcs', 'azure'
    // Amazon S3
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || '',
      accessKey: process.env.AWS_ACCESS_KEY_ID || '',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    // Google Cloud Storage
    gcs: {
      bucket: process.env.GCS_BUCKET || '',
      keyFilePath: process.env.GCS_KEY_FILE || '',
    },
    // Azure Blob Storage
    azure: {
      accountName: process.env.AZURE_STORAGE_ACCOUNT || '',
      accountKey: process.env.AZURE_STORAGE_KEY || '',
      containerName: process.env.AZURE_CONTAINER || '',
    },
  },
};

/**
 * 主备份函数
 */
async function runBackup() {
  try {
    console.log('开始数据库备份...');
    
    // 确保备份目录存在
    ensureDirectoryExists(config.backupDir);
    
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${config.database.name}_${timestamp}.sql`;
    const backupFilePath = path.join(config.backupDir, backupFileName);
    
    // 执行备份命令
    await backupDatabase(backupFilePath);
    console.log(`备份已创建: ${backupFilePath}`);
    
    // 压缩备份文件
    const compressedFileName = `${backupFileName}.gz`;
    const compressedFilePath = path.join(config.backupDir, compressedFileName);
    await compressBackup(backupFilePath, compressedFilePath);
    console.log(`备份已压缩: ${compressedFilePath}`);
    
    // 删除原始备份文件
    fs.unlinkSync(backupFilePath);
    
    // 上传到远程存储
    if (config.remoteStorage.enabled) {
      await uploadToRemoteStorage(compressedFilePath, compressedFileName);
      console.log(`备份已上传到远程存储`);
    }
    
    // 清理旧备份
    cleanupOldBackups();
    console.log('旧备份已清理');
    
    console.log('备份完成!');
  } catch (error) {
    console.error('备份过程中出错:', error);
    process.exit(1);
  }
}

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 执行数据库备份
 */
async function backupDatabase(outputPath: string) {
  const { host, port, user, password, name } = config.database;
  
  // 构建MySQL转储命令
  const command = `mysqldump --host=${host} --port=${port} --user=${user} --password=${password} ${name} > ${outputPath}`;
  
  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`数据库备份失败: ${error}`);
  }
}

/**
 * 压缩备份文件
 */
async function compressBackup(inputPath: string, outputPath: string) {
  const command = `gzip -c ${inputPath} > ${outputPath}`;
  
  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`压缩备份失败: ${error}`);
  }
}

/**
 * 上传到远程存储
 */
async function uploadToRemoteStorage(filePath: string, fileName: string) {
  const { type } = config.remoteStorage;
  
  if (type === 's3') {
    await uploadToS3(filePath, fileName);
  } else if (type === 'gcs') {
    await uploadToGCS(filePath, fileName);
  } else if (type === 'azure') {
    await uploadToAzure(filePath, fileName);
  } else {
    throw new Error(`不支持的远程存储类型: ${type}`);
  }
}

/**
 * 上传到Amazon S3
 */
async function uploadToS3(filePath: string, fileName: string) {
  const { bucket, region, accessKey, secretKey } = config.remoteStorage.s3;
  
  // 避免在没有AWS密钥的情况下尝试上传
  if (!accessKey || !secretKey) {
    console.log('跳过S3上传: 未配置AWS凭证');
    return;
  }
  
  const command = `aws s3 cp ${filePath} s3://${bucket}/${fileName} --region ${region}`;
  
  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`S3上传失败: ${error}`);
  }
}

/**
 * 上传到Google Cloud Storage
 */
async function uploadToGCS(filePath: string, fileName: string) {
  const { bucket, keyFilePath } = config.remoteStorage.gcs;
  
  // 避免在没有GCS密钥的情况下尝试上传
  if (!keyFilePath) {
    console.log('跳过GCS上传: 未配置GCS凭证');
    return;
  }
  
  const command = `gcloud storage cp ${filePath} gs://${bucket}/${fileName} --key-file=${keyFilePath}`;
  
  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`GCS上传失败: ${error}`);
  }
}

/**
 * 上传到Azure Blob Storage
 */
async function uploadToAzure(filePath: string, fileName: string) {
  const { accountName, accountKey, containerName } = config.remoteStorage.azure;
  
  // 避免在没有Azure密钥的情况下尝试上传
  if (!accountName || !accountKey) {
    console.log('跳过Azure上传: 未配置Azure凭证');
    return;
  }
  
  const command = `az storage blob upload --account-name ${accountName} --account-key ${accountKey} --container-name ${containerName} --file ${filePath} --name ${fileName}`;
  
  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Azure上传失败: ${error}`);
  }
}

/**
 * 清理旧备份
 */
function cleanupOldBackups() {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - config.retentionDays);
  
  const files = fs.readdirSync(config.backupDir);
  
  for (const file of files) {
    const filePath = path.join(config.backupDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile() && stats.mtime < retentionDate) {
      fs.unlinkSync(filePath);
      console.log(`已删除旧备份: ${file}`);
    }
  }
}

/**
 * 运行备份
 */
runBackup().catch(console.error);

// 允许通过命令行参数控制行为
if (require.main === module) {
  runBackup().catch(console.error);
} 