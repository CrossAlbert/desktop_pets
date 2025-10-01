import fs from 'fs';
import logger from 'electron-log';


/**
 * 递归查找修改位置并完成修改
 * @param obj 查找的对象
 * @param attributeChain 指定修改json的属性 同时使用array表明递归层级
 * @param value 修改值
 * @param level 递归层级
 * @returns 布尔 用于判断是否找到修改位置并修改成功
 */
const searchAttributes = (obj: { [key: string]: any }, attributeChain: string[], value: any, level: number): boolean => {
    // 提供的修改值的类型
    const valueType = Object.prototype.toString.call(value);

    // 标志是否找到指定修改属性并完成修改
    let flag = false;

    // 遍历元素
    for (let key of Object.keys(obj)) {
        // 当前元素类型
        const itemType = Object.prototype.toString.call(obj[key]);
        // 如果当前遍历的元素为数组 修改层级指向的属性名为数字
        const levelKey = Array.isArray(obj) ? parseInt(attributeChain[level]) : attributeChain[level];

        if (key == levelKey && level === attributeChain.length - 1 && itemType == valueType) {
            // 如果修改的属性名存在 且 已经达到指定的修改层级 且 修改的值的类型与旧类型符合 修改json
            obj[levelKey] = value;
            flag = true;
            break;
        } else if (key == levelKey && (itemType === "[object Array]" || itemType === "[object Object]")) {
            // 当前属性名符合当前层级目标名 且 对应值可继续遍历 且 层级未溢出
            const levelAdd = level + 1;
            if (levelAdd < attributeChain.length) {
                // 递归调用
                flag = searchAttributes(obj[key], attributeChain, value, levelAdd);
                // 如果完成提前终止
                if (flag) {
                    break;
                }
            }
        }
    }

    return flag;

}



/**
 * 修改指定位置的json内容
 * @param path 即将修改的json文件路径
 * @param attributeChain 指定修改json的属性 array类型保证深层属性也可修改 [第一层属性名， 第二层属性名， ...]
 * @param value 修改的属性值
 */
const changeJsonFile = async (path: string, attributeChain: string[], value: any) => {
    try {

        // 读取文件
        const file = await new Promise<string>((resolve, reject) => {
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });


        // 解析json文件内容
        const json = JSON.parse(file);


        // 遍历查找属性 如果找到 修改json
        const flag = searchAttributes(json, attributeChain, value, 0);


        // 查找并修改成功 写入文件
        if (flag) {
            await new Promise<void>((resolve, reject) => {
                fs.writeFile(path, JSON.stringify(json, null, 2), 'utf8', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            })
        } else {
            throw new Error('The specified attribute was not found');
        }


    } catch (error) {
        logger.error(error);
    }
}


// 测试调用
// changeJsonFile('D:\\0_test\\0.json', ["scripts", "test"], '12')

export default changeJsonFile;