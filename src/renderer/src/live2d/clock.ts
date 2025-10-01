export class Clock {
    private _lastTime: number = 0;
    private _deltaTime: number = 0;

    constructor() {
        this._lastTime = performance.now();
    }

    getDeltaTime(): number {
        return this._deltaTime;
    }

    update(): number {
        const currentTime = Date.now();
        this._deltaTime = (currentTime - this._lastTime) / 1000; // 转为秒
        this._lastTime = currentTime;
        return this._deltaTime;
    }
}