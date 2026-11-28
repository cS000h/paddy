// 小屋里六处摆设，每处四种样子（G-34 回稿）。只换好看，不做更强；买下的收着，随时换回。
// 唯一的例外是合不合时令：凉席夏天、厚棉被冬天睡得舒坦，反季节睡得难受（content/body.js 的 BED_SEASON）。
// 规则在 sim/plugins/decor.js，画在 art/furniture.js。
//   object 对应小屋地图上的哪个物件；styles 第一样 default 是原样（不花钱、不用买）
//   from 托谁做 / 在哪买：shi 石伯、gui 桂嫂、qiao 小乔、peddler 货郎老陈；town 是县城货，等阿满捎（第 7 步），现在买不到
//   line 换上时的旁白（稿里每处还有一句乡邻串门时的夸奖，等串门那步再接）
export const DECOR_MAKERS = Object.freeze({
  shi: '石伯',
  gui: '桂嫂',
  qiao: '小乔',
  peddler: '货郎老陈',
  town: '县城',
});

export const DECOR = Object.freeze({
  bed: {
    name: '床',
    object: 'bed',
    styles: {
      default: {
        name: '旧松木板床',
        desc: '素木板架配灰白粗布被，边角磨得发亮。',
        price: 0,
        line: '还是这张旧板床，睡惯了倒也顺身。',
      },
      bamboo: {
        name: '竹编凉席床',
        desc: '细篾青竹席配素青薄被，夏天躺着不粘背。',
        from: 'shi',
        price: 38,
        line: '竹席一铺上，屋里顿时生出几分凉气。',
      },
      quilt: {
        name: '蓝印花布厚棉被床',
        desc: '靛蓝印白花厚棉被铺得鼓囊囊，枕头绣着并蒂草。',
        from: 'gui',
        price: 75,
        line: '棉被一抖开，满屋都是晒过太阳的棉花味。',
      },
      canopy: {
        name: '雕花木架素纱帐床',
        desc: '深木雕花床架挂素白细纱帐，四角垂着朱红流苏。',
        from: 'peddler',
        price: 130,
        line: '纱帐垂下来，这间借住的小屋倒像自家正房了。',
      },
    },
  },
  table: {
    name: '饭桌',
    object: 'table',
    styles: {
      default: {
        name: '旧榆木方桌',
        desc: '桌面发白带木纹，摆着一只粗陶碗。',
        price: 0,
        line: '旧榆木桌搬回原处，照旧稳稳当当。',
      },
      cloth: {
        name: '素蓝桌布茶饭桌',
        desc: '铺一块靛蓝棉布桌巾，摆着粗瓷茶壶和两只小杯。',
        from: 'gui',
        price: 30,
        line: '桌布四角一抚平，粗茶淡饭看着也体面。',
      },
      bamboo: {
        name: '青竹编面饭桌',
        desc: '细竹条密密嵌在木框里，桌心放着鲜果碟和竹筷筒。',
        from: 'shi',
        price: 62,
        line: '竹面滑溜清亮，擦起来比木头省事多了。',
      },
      lacquer: {
        name: '朱漆描金八仙桌',
        desc: '暗红朱漆亮面，桌角滚一道淡金边，摆着青瓷茶具。',
        from: 'town',
        price: 125,
        line: '朱漆桌面映着窗光，端碗吃饭都觉得讲究。',
      },
    },
  },
  scroll: {
    name: '墙上挂轴',
    object: 'scroll',
    styles: {
      default: {
        name: '素白旧纸轴',
        desc: '微微泛黄的素纸空轴，下端坠两根旧木轴头。',
        price: 0,
        line: '空纸轴挂回墙上，倒也留着几分清静。',
      },
      bamboo: {
        name: '墨竹中堂',
        desc: '淡墨几竿清竹斜出，边上留着小乔的一枚小朱印。',
        from: 'qiao',
        price: 35,
        line: '几笔墨竹一上墙，屋里像是多了一股风。',
      },
      landscape: {
        name: '青绿溪山图',
        desc: '远山抹石青，近处一叶小舟泊在柳岸，像极了村口渡头。',
        from: 'qiao',
        price: 88,
        line: '退两步细看，那渡口的小船画得真活。',
      },
      peony: {
        name: '绫裱牡丹中堂',
        desc: '淡黄锦绫装裱，朱红紫红牡丹开得满幅，紫檀木轴头。',
        from: 'peddler',
        price: 120,
        line: '满墙富贵气，屋里顿时亮堂了不少。',
      },
    },
  },
  sill: {
    name: '窗台',
    object: 'sill',
    styles: {
      default: {
        name: '空窗台与鹅卵石',
        desc: '旧木窗台边随手搁着两颗溪边捡的鹅卵石。',
        price: 0,
        line: '窗台空出来，只留两颗溪石晒太阳。',
      },
      jar: {
        name: '粗陶插野花瓶',
        desc: '一只土褐粗陶小瓶，插着几枝带露水的野菊和绿叶。',
        from: 'peddler',
        price: 22,
        line: '野花插进陶瓶，窗边一下子活泛了。',
      },
      herb: {
        name: '竹编晒药小簸箕',
        desc: '小巧竹簸箕里摊着艾草、陈皮和干茶芽，晒着太阳满窗清香。',
        from: 'shi',
        price: 45,
        line: '日头一照，草药和茶芽的香味慢慢散开了。',
      },
      celadon: {
        name: '县城青瓷梅瓶',
        desc: '粉青釉面温润发亮，斜插一枝红梅，阳光照过来映出淡青光。',
        from: 'town',
        price: 95,
        line: '青瓷瓶往窗台一放，连窗外的天色都衬清了。',
      },
    },
  },
  rug: {
    name: '地毯',
    object: 'rug',
    styles: {
      default: {
        name: '旧蒲草编席',
        desc: '发黄的干蒲草粗编席子，边上有些毛刺。',
        price: 0,
        line: '蒲草席重新铺平，踩着还是熟悉的那点糙劲。',
      },
      stripe: {
        name: '蓝白条纹土布毯',
        desc: '结实的靛蓝与米白手织条纹布毯，踩上去软和不凉脚。',
        from: 'gui',
        price: 42,
        line: '土布毯铺在屋心，光脚踩上去暖和多了。',
      },
      bamboo: {
        name: '双色细篾花纹竹席',
        desc: '浅青与蜜黄细竹篾交错编出回字纹，凉爽齐整。',
        from: 'shi',
        price: 78,
        line: '细篾竹席严丝合缝，看着就让人心里舒坦。',
      },
      embroidered: {
        name: '朱红暗纹羊毛绒毯',
        desc: '厚实暗红织毯，滚着浅金回纹边，正中织一朵缠枝莲。',
        from: 'town',
        price: 150,
        line: '绒毯往地上一铺，整间屋子都显得暖融融的。',
      },
    },
  },
  corner: {
    name: '屋角',
    object: 'jars',
    styles: {
      default: {
        name: '旧腌菜粗陶坛',
        desc: '一只灰褐粗陶大坛，盖着块圆木板。',
        price: 0,
        line: '粗陶坛挪回墙角，还是老样子。',
      },
      basket: {
        name: '双层青竹杂物架',
        desc: '两层细竹编架子，上层放茶罐，下层收着草帽和布卷。',
        from: 'shi',
        price: 32,
        line: '零碎物件都有了去处，屋角利索多了。',
      },
      lamp: {
        name: '纸糊木架落地灯',
        desc: '高挑木架糊着素白绵纸，点起油灯暖黄一片，夜里屋角不发黑。',
        from: 'peddler',
        price: 68,
        line: '灯罩一亮，连屋角都浮出一层暖光。',
      },
      screen: {
        name: '青绿山水小围屏',
        desc: '两折木框小屏风，画着荷塘白鹭，立在屋角雅致得紧。',
        from: 'qiao',
        price: 115,
        line: '小围屏往屋角一立，陋室顿时多了几分雅气。',
      },
    },
  },
});

export const DECOR_SLOTS = Object.freeze(Object.keys(DECOR));
/** 'bed.quilt' 这样的编号：哪一处、哪一样。 */
export const decorId = (slot, style) => slot + '.' + style;
