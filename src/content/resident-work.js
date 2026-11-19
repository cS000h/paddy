// 地点由规则作息指定。短路线只在这个工位周围走，点人、开窗、改作息都能打断。
export const RESIDENT_WORK = Object.freeze({
  'shi.field': {
    act: 'feelSoil',
    stops: [
      [0, 0],
      [0, -2],
      [0, 1],
    ],
  },
  'aman.field': {
    act: 'feelSoil',
    stops: [
      [0, 0],
      [-1, 1],
    ],
  },
  'shi.yard': { act: 'weave', rain: 'sit' },
  'shi.tea': { act: 'sip' },
  'gui.yard': { act: 'hangCloth', rain: 'sortGreens' },
  'gui.tea': { act: 'sip' },
  'qiao.market': { act: 'countBeads', rain: 'sit' },
  'zhou.river': { act: 'mendNet', rain: 'sit' },
  'yun.hill': { act: 'gather:tea', rain: 'sit' },
  'zhou.tea': { act: 'sip' },
});
