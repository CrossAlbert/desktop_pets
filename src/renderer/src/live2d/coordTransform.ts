import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix';

     
export class CoordTransform {
    // 将设备坐标转换为屏幕坐标
    _deviceToScreen: CubismMatrix44;
    // 将世界坐标系中的物体转换到相机（视点）坐标系中。
    _viewMatrix: CubismViewMatrix;
    _canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this._deviceToScreen = new CubismMatrix44();
        this._viewMatrix = new CubismViewMatrix();
        this._canvas = canvas;


        const { width, height } = canvas;

        const ratio: number = width / height;
        const left: number = -ratio;
        const right: number = ratio;
        const bottom: number = -1;
        const top: number = 1;

        // 与设备相对应的屏幕范围。X左端、X右端、Y下端、Y上端
        this._viewMatrix.setScreenRect(left, right, bottom, top);
        this._viewMatrix.scale(1, 1);

        this._deviceToScreen.loadIdentity();

        if (width > height) {
            const screenW: number = Math.abs(right - left);
            this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
        } else {
            const screenH: number = Math.abs(top - bottom);
            this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
        }
        this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);


        this._viewMatrix.setMaxScale(2);
        this._viewMatrix.setMinScale(1);
        this._viewMatrix.setMaxScreenRect(-2, 2, -2, 2);
    }




    public getViewMatrix() {
        return this._viewMatrix;
    }



    /**
     * 将设备坐标转换为屏幕坐标
     * @param deviceX 
     * @param deviceY 
     * @returns 
     */
    public transformView(deviceX: number, deviceY: number): { x: number, y: number } {
        // 获取经过逻辑坐标转换后的坐标
        const screenX: number = this._deviceToScreen!.transformX(deviceX);
        const screenY: number = this._deviceToScreen!.transformY(deviceY);
        // 获取放大、缩小、移动后的值
        return {
            x: this._viewMatrix.invertTransformX(screenX),
            y: this._viewMatrix.invertTransformY(screenY)
        }
    }




    public transformScreen(deviceX: number, deviceY: number): { x: number, y: number } {
        return {
            x: this._deviceToScreen!.transformX(deviceX),
            y: this._deviceToScreen!.transformY(deviceY)
        }
    }


}