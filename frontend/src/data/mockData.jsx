// 状态映射表
export const ARTICLE_STATUS_MAP = {
  'DRAFT': { label: '草稿', color: 'bg-gray-100 text-gray-500' },
  'PENDING_ASSIGN_1': { label: '一审待分配', color: 'bg-orange-100 text-orange-700' },
  'PENDING_REVIEW_1': { label: '一审待领取', color: 'bg-orange-50 text-orange-600' },
  'REVIEWING_1': { label: '一审中', color: 'bg-indigo-100 text-indigo-700' },
  'PENDING_ASSIGN_2': { label: '二审待分配', color: 'bg-purple-100 text-purple-700' },
  'PENDING_REVIEW_2': { label: '二审待领取', color: 'bg-purple-50 text-purple-600' },
  'REVIEWING_2': { label: '二审中', color: 'bg-pink-100 text-pink-700' },
  'READY_TO_PUBLISH': { label: '待发布', color: 'bg-green-100 text-green-700' },
  'PUBLISHED': { label: '已发布', color: 'bg-green-600 text-white' },
  'REJECTED': { label: '已驳回', color: 'bg-red-100 text-red-700' }
};