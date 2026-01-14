import { Cfg } from '@/config'
import { dir } from '@/dir'
import { logger, Message } from 'node-karin'
import { Manager } from './ApiUrlManager'

const ApiKeyTip = false

class API {
  e: Message
  constructor (e: Message) {
    this.e = e
  }

  async request (url: string, params: any, method = 'GET', opts: any = {}) {
    const { responseType = 'json' } = opts
    const { apiKey } = Cfg.config.delta_force
    if (!apiKey) {
      const errorMsg = 'APIKey 未配置，请联系机器人管理员。'
      if (!ApiKeyTip) {
        logger.error(`${dir.name} APIKey 未配置，无法进行 API 请求。`)
      }
      if (this.e) {
        await this.e.reply(errorMsg)
      }
      if (responseType === 'stream') {
        return { stream: null, error: { message: errorMsg } }
      }
      return false
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`
    }

    const baseUrl = Manager.getBaseUrl()
    let fullUrl = `${baseUrl}${url}`
    const upperCaseMethod = method.toUpperCase()
    const fetchOptions = { method: upperCaseMethod, headers }

    if (upperCaseMethod === 'GET') {
      if (params) {
        const processedParams = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            // 对于数组参数，将其转换为JSON字符串格式：[id1,id2,id3]
            processedParams.append(key, JSON.stringify(value))
          } else if (value !== null && value !== undefined) {
            processedParams.append(key, value)
          }
        }
        const queryString = processedParams.toString()
        fullUrl += `?${queryString}`
      }
    } else if (upperCaseMethod === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      fetchOptions.body = new URLSearchParams(params).toString()
    }

    try {
      const response = await fetch(fullUrl, fetchOptions)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: `API 错误: ${response.statusText}` }))
        logger.error(`[DELTA FORCE PLUGIN] API 请求失败: ${response.status} ${response.statusText} - ${fullUrl}`)
        logger.error(`[DELTA FORCE PLUGIN] 错误详情: ${JSON.stringify(errorBody)}`)

        // 如果是网络错误或服务器错误（5xx），且为 auto 模式，标记地址失败并重试
        if (response.status >= 500 && apiUrlManager.getMode() === 'auto') {
          apiUrlManager.markUrlFailed(baseUrl)
          // 如果还有可用地址，自动切换到下一个并重试一次
          const newBaseUrl = apiUrlManager.getBaseUrl()
          if (newBaseUrl !== baseUrl) {
            logger.info(`[DELTA FORCE PLUGIN] 自动切换到新地址并重试: ${newBaseUrl}`)
            const newFullUrl = `${newBaseUrl}${url}`
            try {
              const retryResponse = await fetch(newFullUrl, fetchOptions)
              if (retryResponse.ok) {
                if (responseType === 'stream') {
                  return { stream: retryResponse.body, error: null }
                }
                const retryBody = await retryResponse.json().catch(() => ({}))
                return retryBody
              }
            } catch (retryError) {
              logger.error(`[DELTA FORCE PLUGIN] 重试请求也失败: ${retryError}`)
            }
          }
        }

        if (responseType === 'stream') {
          return { stream: null, error: errorBody }
        }
        return errorBody
      }

      if (responseType === 'stream') {
        return { stream: response.body, error: null }
      }

      const responseBody = await response.json().catch(() => ({}))

      // 判断是否为轮询接口：登录状态轮询等正常的中间状态不应该被当作错误
      const isLoginStatusPolling = fullUrl.includes('/login/') && fullUrl.includes('/status')
      const isOAuthStatusPolling = fullUrl.includes('/oauth/status') || fullUrl.includes('/oauth/platform-status')
      const isNormalPollingStatus = isLoginStatusPolling || isOAuthStatusPolling

      // 只有在非轮询接口或明确的错误状态时才打印警告
      if (responseBody.code !== 0 && responseBody.success !== true && !isNormalPollingStatus) {
        logger.warn(`[DELTA FORCE PLUGIN] API 返回业务错误: ${responseBody.msg || responseBody.message || '未知错误'} - ${fullUrl}`)
      }

      return responseBody
    } catch (error) {
      const errorMsg = '网络请求异常，请检查后端服务是否可用'
      logger.error(`[DELTA FORCE PLUGIN] 网络请求异常: ${error} - ${fullUrl}`)

      // 如果是网络错误，且为 auto 模式，标记地址失败并重试
      if (apiUrlManager.getMode() === 'auto') {
        apiUrlManager.markUrlFailed(baseUrl)
        // 如果还有可用地址，自动切换到下一个并重试一次
        const newBaseUrl = apiUrlManager.getBaseUrl()
        if (newBaseUrl !== baseUrl) {
          logger.info(`[DELTA FORCE PLUGIN] 自动切换到新地址并重试: ${newBaseUrl}`)
          // 重新构建 fullUrl（包括查询参数）
          let newFullUrl = `${newBaseUrl}${url}`
          if (upperCaseMethod === 'GET' && params) {
            const processedParams = new URLSearchParams()
            for (const [key, value] of Object.entries(params)) {
              if (Array.isArray(value)) {
                processedParams.append(key, JSON.stringify(value))
              } else if (value !== null && value !== undefined) {
                processedParams.append(key, value)
              }
            }
            const queryString = processedParams.toString()
            newFullUrl += `?${queryString}`
          }
          try {
            const retryResponse = await fetch(newFullUrl, fetchOptions)
            if (retryResponse.ok) {
              if (responseType === 'stream') {
                return { stream: retryResponse.body, error: null }
              }
              const retryBody = await retryResponse.json().catch(() => ({}))
              return retryBody
            }
          } catch (retryError) {
            logger.error(`[DELTA FORCE PLUGIN] 重试请求也失败: ${retryError}`)
          }
        }
      }

      if (responseType === 'stream') {
        return { stream: null, error: { message: errorMsg } }
      }
      return false
    }
  }
}
