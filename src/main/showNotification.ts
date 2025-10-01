import { Notification, shell } from 'electron';

export const showNotification = (roomId: number, roomName: string) => {
    const notification = new Notification({
        title: `${roomName}开播啦`,
        body: '点击打开直播间',
    });

    // 点击通知时，使用默认浏览器打开链接
    notification.on('click', () => {
        shell.openExternal(`https://live.bilibili.com/${roomId}`);
    });

    notification.show();
}

