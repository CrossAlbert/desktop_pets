import fs from 'fs';
import path from 'path';
import logger from 'electron-log';


const getPreviewList = async (dirPath: string): Promise<Array<PreviewItemIpc>> => {
    try {
        // 读取目录内容
        const files = await new Promise<fs.Dirent<string>[]>((resolve, reject) => {
            fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(files)
                }
            });
        })

        const previewList: Array<PreviewItemIpc> = [];

        files.forEach(file => {
            // 判断是否是目录
            if (file.isDirectory()) {

                const subDirPath = path.join(dirPath, file.name);

                const previewJsonPath = path.join(subDirPath, 'preview_pet.json');
                const previewJpgPath = path.join(subDirPath, 'preview_pet.jpg');

                // 检查子目录下的preview.json和preview.jpg
                if (fs.existsSync(previewJsonPath) && fs.existsSync(previewJpgPath)) {
                    previewList.push({
                        previewJsonPath,
                        previewJpgPath,
                        petFilePath: subDirPath
                    })
                }

            }
        });

        return previewList;

    } catch (error) {
        logger.error(error)
        return [];
    }
}


export default getPreviewList;
