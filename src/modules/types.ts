/** 接口模式 */

export type ModeType = 'auto' | keyof ApiUrlsType

/** 后端地址 */
export interface ApiUrlsType {
  /** 默认地址 */
  default: string
  /** EO地址 */
  eo: string
  /** ESA地址 */
  esa: string
}
