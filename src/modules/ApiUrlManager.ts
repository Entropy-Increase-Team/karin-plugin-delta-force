import { Cfg } from '@/config'
import { logger } from 'node-karin'
import { ApiUrlsType, ModeType } from './types'

/**
 * API URL 管理器
 * 负责管理多个后端地址，支持故障转移和模式切换
 */
class ApiUrlManager {
  // 三个后端地址
  urls: ApiUrlsType = {
    default: 'https://df-api.shallow.ink',
    esa: 'https://df-api-esa.shallow.ink',
    eo: 'https://df-api-eo.shallow.ink'
  }

  /** Url索引 */
  urlIndex = 2
  // 当前模式
  mode: ModeType = Cfg.config.delta_force.ApiMode || 'auto' // 默认模式为 auto
  // 失败的地址记录（用于故障转移）
  failedKeys = new Set<string>()
  // 地址失败时间戳（用于自动恢复）
  urlFailureTime = new Map<string, NodeJS.Timeout>()
  // 失败地址的恢复时间（5分钟）
  failureRecoveryTime = 5 * 60 * 1000

  /**
   * 设置模式（用于测试或动态切换）
   * @param mode - 'auto' | 'default' | 'eo' | 'esa'
   */
  setMode (mode: ModeType) {
    if (['auto', ...Object.keys(this.urls)].includes(mode)) {
      this.mode = mode
      // 切换模式时重置失败记录
      this.failedKeys.clear()
      this.urlFailureTime.clear()
    } else {
      logger.warn(`[ApiUrlManager] 无效的模式: ${mode}，使用默认 auto`)
      this.mode = 'auto'
    }
  }

  /**
   * 获取当前应该使用的 API 地址
   * @returns API 基础地址
   */
  getBaseUrl () {
    switch (this.mode) {
      case 'default':
        return this.urls.default

      case 'eo':
        return this.urls.eo

      case 'esa':
        return this.urls.esa

      case 'auto':
      default:
        return this.getAutoUrl()
    }
  }

  /**
   * 获取 auto 模式下的地址（带故障转移）
   * @returns API 基础地址
   */
  getAutoUrl () {
    const key = Object.keys(this.urls).filter(k => !this.failedKeys.has(k)) as Array<keyof ApiUrlsType>
    if (key.length === 0) {
      logger.warn('[ApiUrlManager] 所有地址都标记为失败，重置失败记录')
      this.failedKeys.clear()
      this.urlFailureTime.clear()
      return Object.values(this.urls)[this.urlIndex % Object.values(this.urls).length]
    }
    let found = false
    let attempts = 0
    let url = null

    while (!found && attempts < key.length) {
      const index = attempts % key.length
      url = this.urls[key[index]]

      if (!this.failedKeys.has(key[index])) {
        found = true
      } else {
        attempts++
      }
    }
    if (found && url) {
      return url
    }
    return this.urls.default
  }

  /**
   * 标记地址为失败（用于故障转移）
   * @param url - 失败的地址
   */
  markUrlFailed (key: keyof ApiUrlsType) {
    this.failedKeys.add(key)
    const timeout = setTimeout(() => {
      this.failedKeys.delete(key)
      this.urlFailureTime.delete(key)
      logger.warn(`[ApiUrlManager] ${key} 地址恢复可用`)
    }, this.failureRecoveryTime)
    this.urlFailureTime.set(key, timeout)
    logger.warn(`[ApiUrlManager] ${key} 地址标记为失败`)
  }

  /**
   * 重置所有失败记录（用于手动恢复）
   */
  resetFailures () {
    this.failedKeys.clear()
    this.urlFailureTime.clear()
    this.urlIndex = 0
    logger.info('[ApiUrlManager] 已重置所有记录')
  }

  /**
   * 获取当前状态信息（用于调试）
   * @returns 状态信息
   */
  getStatus () {
    return {
      mode: this.mode,
      currentUrl: this.getBaseUrl(),
      currentIndex: this.urlIndex,
      failedUrls: Array.from(this.failedKeys),
      urlFailureTime: Object.fromEntries(this.urlFailureTime)
    }
  }
}

export const Manager = new ApiUrlManager()
