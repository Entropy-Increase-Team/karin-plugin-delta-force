import { ModeType } from '@/modules'

export interface ConfigType {
  delta_force: {
    /** APIKEY */
    apiKey: string
    /** 客户端ID */
    clientID: string
    /** API模式 */
    ApiMode: ModeType
    /** 推送 */
    Push: {
      /** 每日密码推送 */
      DailyKeyword: PushType
      /** 特勤处完成推送 */
      PlaceStatus: PushType
      /** 每日战报推送 */
      DailyReport: PushType
      /** 每周战报推送 */
      WeeklyReport: PushType
    }
    /** Web登录 */
    webLogin: {
      /** 是否允许其他机器人共用网页登陆数据 */
      allow_share_with_other_bots: boolean
    }
    /** ws */
    websocket: {
      /** 是否启用自动连接 */
      auto_connect: boolean
    }
    /** 广播通知 */
    broadcast_notification: {
      /** 是否启用 */
      enabled: boolean
      /** 推送目标 */
      push_to: {
        /** 推送群聊 */
        group: []
        /** 是否启用私聊推送 */
        private_enabled: boolean
        /** 推送私聊 */
        private: []
      }
    }
  }
}
/** 推送配置 */
interface PushType {
  /** 是否启用 */
  enabled: boolean
  /** 推送时间的cron表达式 */
  cron: string
  /** 推送列表 */
  pushList: {
    /** 全局默认配置 */
    Defglobal: {
      group: string[]
      private: string[]
    },
    /** 用户配置 */
    user: {
      /** BotId */
      [Botid: string]: {
        /** 是否启用 */
        enabled: boolean
        /** 推送群聊 */
        group: string[]
        /** 推送私聊 */
        private: string[]
      }
    }
  }
}
