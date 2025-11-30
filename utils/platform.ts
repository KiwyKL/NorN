// Platform detection utilities

export const getPlatform = (): 'Android' | 'iOS' | 'Web' => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // Check for Android
    if (/android/i.test(userAgent)) {
        return 'Android';
    }

    // Check for iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        return 'iOS';
    }

    // Default to Web
    return 'Web';
};

export const getDeviceInfo = () => {
    const platform = getPlatform();
    const userAgent = navigator.userAgent;

    return {
        platform,
        userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timestamp: new Date().toISOString()
    };
};
