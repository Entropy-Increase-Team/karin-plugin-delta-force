import { Cfg } from '@/config'
import karin, { logger, Message, redis } from 'node-karin'

const getClientId = (e: Message) => {
  const clientID = Cfg.config.delta_force.clientID
  if (!clientID) {
    e.reply('clientID 未在配置文件中正确设置，请联系管理员。')
    return null
  }

  const activeTokens = {
    qq_wechat: await this.getGroupedActiveToken(this.e.user_id, 'qq_wechat'),
    wegame: await this.getGroupedActiveToken(this.e.user_id, 'wegame'),
    qqsafe: await this.getGroupedActiveToken(this.e.user_id, 'qqsafe')
  }

  const res = await this.api.getUserList({ clientID, platformID: this.e.user_id, clientType: 'qq' })

  if (!res || res.code !== 0) {
    this.e.reply(`查询账号列表失败: ${res?.msg || res?.message || '未知错误'}`)
    return null
  }

  const accounts = res.data || []
  const grouped = {
    qq_wechat: [],
    wegame: [],
    qqsafe: []
  }

  // 用于解绑和切换时维持 showAccounts 的序号顺序
  const allInOrder = []

  accounts.forEach(acc => {
    const type = acc.tokenType?.toLowerCase()
    if (type === 'qq' || type === 'wechat') {
      grouped.qq_wechat.push(acc)
    } else if (type === 'wegame' || type === 'wegame/wechat') {
      grouped.wegame.push(acc)
    } else if (type === 'qqsafe') {
      grouped.qqsafe.push(acc)
    }
  })

  // 按照分组顺序构建完整列表
  allInOrder.push(...grouped.qq_wechat)
  allInOrder.push(...grouped.wegame)
  allInOrder.push(...grouped.qqsafe)

  return { all: allInOrder, grouped, activeTokens }
}

const getGroupedActiveToken = async (userId: string, group: string) => {
  try {
    // 从Redis获取当前分组的激活token
    return await redis.get(`delta-force:${group}-token:${userId}`)
  } catch (e) {
    logger.error(`[DELTA FORCE PLUGIN] 获取${group}分组Token失败:`, e)
    return null
  }
}
export const showAccounts = karin.command(/^(#三角洲|\\^)账号(列表)?$/, async (e) => {
  const accountData = getClientId(e)
  if (!accountData) return

  const { grouped, activeTokens } = accountData

  if (accountData.all.length === 0) {
    await this.e.reply('您尚未绑定任何账号，请使用 #三角洲登录 进行绑定。')
    return true
  }

  let msg = `【${this.e.sender.card || this.e.sender.nickname}】绑定的账号列表：\n`
  let overallIndex = 1

  const buildGroupMsg = (title, group, groupKey) => {
    if (group.length > 0) {
      msg += `---${title}---\n`
      const groupActiveToken = activeTokens[groupKey] // 获取该分组的激活token

      group.forEach(acc => {
        const token = acc.frameworkToken
        const displayedToken = this.e.isGroup
          ? `${token.substring(0, 4)}****${token.slice(-4)}`
          : token
        const status = acc.isValid ? '【有效】' : '【失效】'
        const isActive = (token === groupActiveToken) ? '✅' : '' // 使用分组激活token判断
        const qqDisplay = acc.qqNumber ? `(${acc.qqNumber.slice(0, 4)}****)` : ''

        msg += `${overallIndex++}. ${isActive}【${acc.tokenType.toUpperCase()}】${qqDisplay} ${displayedToken} ${status}\n`
      })
    }
  }

  buildGroupMsg('QQ & 微信', grouped.qq_wechat, 'qq_wechat')
  buildGroupMsg('Wegame', grouped.wegame, 'wegame')
  buildGroupMsg('QQ安全中心', grouped.qqsafe, 'qqsafe')

  msg += '\n可通过 #三角洲解绑 <序号> 来解绑账号。'
  msg += '\n可通过 #三角洲删除 <序号> 来删除QQ/微信登录数据。'
  msg += '\n使用 #三角洲账号切换 <序号> 可切换当前激活账号。'

  await this.e.reply(msg.trim())
  return true
})
