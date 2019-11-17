import React, { createRef, useState, RefObject, useEffect } from 'react';
import "./VideoScanView.scss";

import { detectQRCodeFromVideo } from '../../../services/Detector';
import { QRCodeData } from '../../../models/qrcode';
import { QRCode } from 'jsqr';

import left from './caret-left.svg';

const isMobile = /(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent);
const facingMode =  isMobile ? { exact: 'environment' } : 'user';

const detect = (video: HTMLVideoElement, callback: (qrcode: QRCode | null) => void) => {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [video.width, video.height];
    const qrcode = detectQRCodeFromVideo({ video, canvas })
    callback(qrcode);
};

const VideoStream: React.FC<{
    stream: MediaStream,
    stop: (s: MediaStream, data?: QRCodeData) => void,
    video: RefObject<HTMLVideoElement>,
}> = ({ stream, stop, video }) => {
    const onSuccess = (data: QRCodeData) => {
        if (video.current) video.current.pause();
        alert(JSON.stringify(data));
        stop(stream, data);
    };
    useEffect(() => {
        const v = video.current;
        if (!v) return console.error('video tag is not ready');
        v.srcObject = stream;
        let id: NodeJS.Timeout;
        const callback = (qrcode: QRCode | null) => {
            if (!qrcode) return;
            clearInterval(id);
            onSuccess(JSON.parse(qrcode.data) as QRCodeData);
        };
        id = setInterval(detect.bind(null, v, callback), 1 * 1000);
    // eslint-disable-next-line
    }, []);
    return (
        <div className="Video_Stream_Container">
            <div className="Video_Stream_Navigation Top">
                <div className="nav-left" onClick={() => stop(stream)}>
                    <img src={left} alt="back" className="nav-item-img" />
                    <span>Back</span>
                </div>
                <div className="nav-title">Scan QR code</div>
                <div className="nav-right"></div>
            </div>
            <div>
                <video ref={video} muted={true} autoPlay playsInline width={'100%'} height={'100%'} />
            </div>
            <div className="Video_Stream_Navigation Bottom">
                <div className="nav-title">Place code inside the box</div>
            </div>
        </div>
    );
};

const VideoScanView: React.FC<{ punch(data: QRCodeData): void }> = ({ punch }) => {
    const [stream, setStream] = useState<MediaStream>();
    const stop = (s: MediaStream, data?: QRCodeData) => {
        setStream(undefined);
        s.getTracks().map(track => track.stop())
        if (data) punch(data);
    };
    const v = createRef<HTMLVideoElement>();
    const onClickStart = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode } });
        setStream(stream);
    };
    return (
        <div className="video-capture-container">
            <button onClick={onClickStart}>SCAN QR CODE</button>
            {stream ? <VideoStream stream={stream} stop={stop} video={v} /> : null}
        </div>
    );
};

export default VideoScanView;
