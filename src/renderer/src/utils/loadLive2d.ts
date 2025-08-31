export const loadLive2DCore = () => {
    const src = new URL('@core/live2dcubismcore.js', import.meta.url).href;

    return new Promise<void>((resolve, reject) => {

        if (window.Live2DCubismCore) {
            // 已经加载过了
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
            if (window.Live2DCubismCore) {
                resolve();
            } else {
                reject(new Error('Live2DCubismCore failed to load'));
            }
        };

        script.onerror = () => {
            reject(new Error('Failed to load live2dcubismcore.js'));
        };

        document.head.appendChild(script);
    });
}