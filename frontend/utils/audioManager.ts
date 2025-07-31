/**
 * 音频管理器 - 处理通知提示音
 */

export type SoundType = 'info' | 'success' | 'warning' | 'error' | 'wancheng';

interface AudioConfig {
  enabled: boolean;
  volume: number; // 0-1
}

class AudioManager {
  private config: AudioConfig;
  private audioCache: Map<SoundType, HTMLAudioElement> = new Map();
  private hasUserInteracted: boolean = false; // 跟踪用户是否已经交互
  
  private readonly soundPaths: Record<SoundType, string> = {
    info: '/sounds/info.wav',           // 项目创建、一般状态变更
    success: '/sounds/success.wav',     // 进入进行中状态
    warning: '/sounds/warning.wav',     // 警告（保留）
    error: '/sounds/error.wav',         // 项目删除
    wancheng: '/sounds/wancheng.wav'    // 已完成状态
  };

  constructor() {
    // 从localStorage读取用户设置，默认禁用音频功能
    // 只在浏览器环境中访问localStorage
    let savedConfig = null;
    if (typeof window !== 'undefined') {
      try {
        savedConfig = localStorage.getItem('notification-audio-config');
      } catch (error) {
        // 忽略localStorage访问错误
      }
    }
    
    this.config = savedConfig ? JSON.parse(savedConfig) : {
      enabled: true,  // 默认启用音频功能
      volume: 0.6     // 默认音量60%
    };

    // 启用音频预加载和用户交互监听
    if (typeof window !== 'undefined') {
      this.preloadSounds();
      this.setupUserInteractionListener();
    }
  }

  /**
   * 设置用户交互监听器
   */
  private setupUserInteractionListener() {
    const enableAudio = () => {
      this.hasUserInteracted = true;
      console.log('✅ 用户已交互，音频播放已启用');
      
      // 移除监听器，只需要监听一次
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    // 监听各种用户交互事件
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
  }

  /**
   * 预加载所有音频文件
   */
  private async preloadSounds() {
    // 只在浏览器环境中预加载音频
    if (typeof window === 'undefined') {
      return;
    }

    for (const [type, soundPath] of Object.entries(this.soundPaths)) {
      try {
        const audio = new Audio(soundPath);
        audio.volume = this.config.volume;
        audio.preload = 'auto';
        
        this.audioCache.set(type as SoundType, audio);
      } catch (error) {
        // 静默处理错误
      }
    }
  }

  /**
   * 播放通知音效
   */
  async playNotificationSound(type: SoundType): Promise<void> {
    // 只在浏览器环境中播放音频
    if (typeof window === 'undefined' || !this.config.enabled) {
      console.log('音频已禁用或非浏览器环境');
      return;
    }

    if (!this.hasUserInteracted) {
      console.log(`用户尚未交互，跳过音效播放: ${type} (这是正常的浏览器安全策略)`);
      return;
    }

    try {
      let audio = this.audioCache.get(type);
      
      // 如果缓存中没有音频，直接创建新的
      if (!audio) {
        console.log(`创建新的音频对象: ${this.soundPaths[type]}`);
        audio = new Audio(this.soundPaths[type]);
        audio.volume = this.config.volume;
        this.audioCache.set(type, audio);
      }

      // 重置播放位置（防止连续播放问题）
      audio.currentTime = 0;
      audio.volume = this.config.volume;

      console.log(`播放音效: ${type}, 音量: ${this.config.volume}, 路径: ${this.soundPaths[type]}`);
      
      // 播放音频
      await audio.play();
      console.log(`音效播放成功: ${type}`);
    } catch (error) {
      // 区分不同类型的错误，避免不必要的错误日志
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          // 用户交互限制错误，这是正常的浏览器安全行为
          console.log(`音效播放需要用户交互: ${type} (这是正常的浏览器安全策略)`);
        } else if (error.name === 'AbortError') {
          // 播放被中断，通常是因为新的播放请求
          console.log(`音效播放被中断: ${type}`);
        } else {
          // 其他真正的错误才记录为错误
          console.error(`音效播放失败: ${type}`, error.message);
        }
      } else {
        console.error(`音效播放失败: ${type}`, error);
      }
    }
  }

  /**
   * 启用/禁用音效
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
    
    // 更新所有缓存音频的音量
    this.audioCache.forEach(audio => {
      audio.volume = this.config.volume;
    });
    
    this.saveConfig();
  }

  /**
   * 获取当前配置
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * 根据项目状态变更选择合适的音效
   */
  getProjectStatusSound(newStatus: string): SoundType {
    switch (newStatus) {
      case 'in_progress':
        return 'success';  // 进入进行中状态使用 success.wav
      case 'completed':
        return 'wancheng'; // 已完成状态使用 wancheng.wav
      default:
        return 'info';     // 其他状态变更使用 info.wav
    }
  }

  /**
   * 根据通知类型和内容智能选择音效
   */
  getNotificationSound(type: string, title: string, message: string): SoundType {
    // 项目删除
    if (message.includes('删除了项目')) {
      return 'error';
    }
    
    // 项目创建
    if (message.includes('创建了项目')) {
      return 'info';
    }
    
    // 项目状态变更
    if (message.includes('状态改为')) {
      if (message.includes('已完成')) {
        return 'wancheng';
      } else if (message.includes('进行中')) {
        return 'success';
      } else {
        return 'info';
      }
    }
    
    // 默认根据通知类型
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  /**
   * 测试播放音效
   */
  async testSound(type: SoundType) {
    console.log(`测试音效: ${type}`);
    
    // 首先尝试获取音频播放权限
    try {
      await this.requestAudioPermission();
    } catch (error) {
      console.warn('获取音频权限失败:', error);
    }
    
    await this.playNotificationSound(type);
  }

  /**
   * 保存配置到localStorage
   */
  private saveConfig() {
    // 只在浏览器环境中保存到localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('notification-audio-config', JSON.stringify(this.config));
      } catch (error) {
        // 忽略localStorage访问错误
      }
    }
  }

  /**
   * 请求音频播放权限（处理浏览器自动播放策略）
   */
  async requestAudioPermission(): Promise<boolean> {
    // 只在浏览器环境中请求权限
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // 播放一个静音的音频来获取权限
      const silentAudio = new Audio();
      silentAudio.volume = 0;
      silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIdBzx+zPLOezYfJnjJrtfr';
      await silentAudio.play();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 创建单例实例（延迟初始化，只在浏览器环境中）
let audioManagerInstance: AudioManager | null = null;

export const audioManager = (() => {
  if (typeof window === 'undefined') {
    // 服务器端返回一个空的mock对象
    return {
      playNotificationSound: async () => {},
      setEnabled: () => {},
      setVolume: () => {},
      getConfig: () => ({ enabled: true, volume: 0.6 }),
      getProjectStatusSound: () => 'info' as SoundType,
      getNotificationSound: () => 'info' as SoundType,
      testSound: async () => {},
      requestAudioPermission: async () => false
    };
  }
  
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  
  return audioManagerInstance;
})();

// 页面加载后尝试获取播放权限（通过用户首次点击）
if (typeof window !== 'undefined') {
  const requestPermissionOnce = () => {
    if (audioManagerInstance) {
      audioManagerInstance.requestAudioPermission();
    }
    document.removeEventListener('click', requestPermissionOnce);
  };
  
  document.addEventListener('click', requestPermissionOnce);
}

export default audioManager;