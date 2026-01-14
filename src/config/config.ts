import { dir } from '@/dir'
import {
  logger,
  requireFileSync,
  mkdirSync,
  existsSync,
  watch,
} from 'node-karin'
import fs from 'node:fs'
import path from 'node:path'
import { ConfigType } from './types'

class Config {
  #init = false
  CfgPath = path.join(dir.ConfigDir, 'config.json')
  /** 配置热重载防抖定时器 */
  #reloadTimer: ReturnType<typeof setTimeout> | null = null
  defConfig: ConfigType = {
    delta_force: {
      apiKey: '',
      clientID: '',
      ApiMode: 'auto',
      Push: {
        DailyKeyword: {
          enabled: true,
          cron: '0 0 0/3 * * ? *',
          pushList: {
            Defglobal: {
              group: [],
              private: []
            },
            user: {}
          }
        },
        PlaceStatus: {
          enabled: true,
          cron: '0 0/10 * * * ? *',
          pushList: {
            Defglobal: {
              group: [],
              private: []
            },
            user: {}
          }
        },
        DailyReport: {
          enabled: false,
          cron: '0 0 10 * * ?',
          pushList: {
            Defglobal: {
              group: [],
              private: []
            },
            user: {}
          }
        },
        WeeklyReport: {
          enabled: false,
          cron: '0 0 10 * * 1',
          pushList: {
            Defglobal: {
              group: [],
              private: []
            },
            user: {}
          }
        }
      },
      webLogin: {
        allow_share_with_other_bots: false
      },
      websocket: {
        auto_connect: true
      },
      broadcast_notification: {
        enabled: true,
        push_to: {
          group: [],
          private_enabled: false,
          private: []
        }
      }
    }
  }

  cache: null | ConfigType = null
  constructor () {
    this.init()
  }

  init (): void {
    if (this.#init) return
    this.#init = true
    if (!existsSync(this.CfgPath)) {
      mkdirSync(path.dirname(this.CfgPath))
      fs.writeFileSync(this.CfgPath, JSON.stringify(this.defConfig, null, 2), 'utf8')
    }
    try {
      watch(this.CfgPath, () => {
        if (this.#reloadTimer) {
          clearTimeout(this.#reloadTimer)
        }

        this.#reloadTimer = setTimeout(() => {
          this.cache = null
          logger.info(`[${dir.name}] 检测到配置文件变更`)
        }, 500)
      })
    } catch (err) {
      logger.error(`[${dir.name}] 配置文件热重载监听初始化失败`, err)
    }
  }

  get config (): ConfigType {
    try {
      if (!this.cache) {
        const cfg = requireFileSync<ConfigType>(this.CfgPath, { force: true })
        this.cache = {
          ...this.defConfig,
          ...cfg
        }
      }
      return this.cache
    } catch (err) {
      logger.error(`[${dir.name}] 读取配置文件失败，已加载默认配置`, err)
      return this.defConfig
    }
  }

  /** 三角洲行动地图数据 */
  get MapData () {
    return {
      2231: '零号大坝-前夜',
      2201: '零号大坝-常规',
      2202: '零号大坝-机密',
      1901: '长弓溪谷-常规',
      1902: '长弓溪谷-机密',
      3901: '航天基地-机密',
      3902: '航天基地-绝密',
      8102: '巴克什-机密',
      8103: '巴克什-绝密',
      8803: '潮汐监狱-绝密',
      34: '烬区-占领',
      33: '烬区-攻防',
      54: '攀升-攻防',
      75: '临界点-攻防',
      103: '攀升-占领',
      107: '沟壕战-攻防',
      108: '沟壕战-占领',
      111: '断轨-攻防',
      112: '断轨-占领',
      113: '贯穿-攻防',
      117: '攀升-钢铁洪流',
      121: '刀锋-攻防',
      210: '临界点-占领',
      227: '沟壕战-钢铁洪流',
      302: '风暴眼-攻防',
      303: '风暴眼-占领',
      526: '断轨-钢铁洪流'
    }
  }

  /** 干员列表 */
  get Operators () {
    return {
      10007: '红狼',
      10010: '威龙',
      10011: '无名',
      20003: '蜂医',
      20004: '蛊',
      30008: '牧羊人',
      30009: '乌鲁鲁',
      30010: '深蓝',
      40005: '露娜',
      40010: '骇爪'
    }
  }

  /** 积分段位 */
  get Rankscore () {
    return {
      sol: {
        1000: '青铜 III',
        1150: '青铜 II',
        1300: '青铜 I',
        1450: '白银 III',
        1600: '白银 II',
        1750: '白银 I',
        1900: '黄金 IV',
        2100: '黄金 III',
        2300: '黄金 II',
        2500: '黄金 I',
        2700: '铂金 IV',
        2900: '铂金 III',
        3100: '铂金 II',
        3300: '铂金 I',
        3500: '钻石 V',
        3750: '钻石 IV',
        4000: '钻石 III',
        4250: '钻石 II',
        4500: '钻石 I',
        4750: '黑鹰 V',
        5000: '黑鹰 IV',
        5250: '黑鹰 III',
        5500: '黑鹰 II',
        5750: '黑鹰 I',
        6000: '三角洲巅峰'
      },
      tdm: {
        0: '列兵 III',
        150: '列兵 II',
        300: '列兵 I',
        450: '上等兵 III',
        600: '上等兵 II',
        750: '上等兵 I',
        900: '军士长 IV',
        1100: '军士长 III',
        1300: '军士长 II',
        1500: '军士长 I',
        1700: '尉官 IV',
        1900: '尉官 III',
        2100: '尉官 II',
        2300: '尉官 I',
        2500: '校官 V',
        2750: '校官 IV',
        3000: '校官 III',
        3250: '校官 II',
        3500: '校官 I',
        3750: '将军 V',
        4000: '将军 IV',
        4250: '将军 III',
        4500: '将军 II',
        4750: '将军 I',
        5000: '统帅'
      }
    }
  }
}
export const Cfg = new Config()
