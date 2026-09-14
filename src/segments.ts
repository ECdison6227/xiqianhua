import type {Note} from './core';
export type Hotspot={id:string;name:string;x:number;y:number;character?:string;text:string;required?:boolean;mini?:string;npc?:'pipa'|'blue'|'grey'|'huashen'|'keeper'|'waiter';note?:Omit<Note,'id'>;};
export type Segment={id:string;name:string;subtitle:string;map:string;entry:{x:number;y:number};exit:string;intro:string;points:Hotspot[];task?:string;};
const note=(title:string,text:string,source='华浅亲眼所见',kind:Note['kind']='观察',question?:string):Omit<Note,'id'>=>({title,text,source,kind,question});
export const segments:Segment[]=[
{id:'E1',name:'新房夜探',subtitle:'晋王府 · 大婚之夜',map:'bedroom',entry:{x:630,y:950},exit:'千芷备好热水了',intro:'陌生的身体，陌生的屋子。先把眼前的事一件件弄清楚。',points:[
{id:'mirror',name:'铜镜',x:800,y:475,text:'镜里的人有着一张陌生而熟悉的脸。原来，我真成了书中的华浅。',required:true,note:note('铜镜里的华浅','铜镜中是华浅的面容。')},
{id:'veil',name:'红盖头',x:615,y:555,text:'红布的触感还留在指尖。这里是晋王府，而今日是大婚之夜。',required:true,note:note('大婚之夜','红盖头、凤冠与满屋红烛，确认了我此刻的处境。')},
{id:'dowry',name:'陪嫁箱',x:855,y:850,text:'箱子里压着一份陪嫁铺子的清单。想离开这一团乱局，至少要先知道自己有什么。',required:true,note:note('陪嫁铺子','陪嫁清单列着铺面，往后可去核对。')},
{id:'crown',name:'凤冠',x:700,y:350,text:'先把凤冠取下来。外侧的簪，不能压着内侧硬拔。',mini:'crown',note:note('凤冠的结构','故宫所藏明代凤冠可见龙凤、珠宝与博鬓等部件；制度与形制随时代及身份而异。小说情境为架空。','故宫博物院 · 点翠嵌珠石金龙凤冠','趣闻','明代凤冠结构')},
{id:'qianzhi',name:'千芷',x:405,y:880,character:'char-qianzhi',text:'小姐，水已让人去备了。您慢些走，别叫衣裳绊着。'},
{id:'clothes',name:'衣柜',x:280,y:700,text:'一柜子素色衣裳，连人设都叠得整整齐齐。',note:note('人设贴到衣柜里','衣裳可以照旧穿，日子却得换个活法。','华浅的吐槽','趣闻','小说里的女配如何改变自己的命运')}]},
{id:'E2',name:'御园观鱼',subtitle:'御花园 · 初秋',map:'garden',entry:{x:610,y:1000},exit:'回到观鱼的人群',intro:'池中游鱼很自在，岸上人的目光却各有去处。',points:[
{id:'nanny',name:'岸边嬷嬷',x:680,y:740,character:'char-limomo',text:'“奴婢在此候着。”她立在岸边，目光并未追着鱼走。',required:true,note:note('候在岸边的人','嬷嬷在岸边候着。这是一处观察，尚不能说明她在等谁。')},
{id:'gaze',name:'太后',x:570,y:280,character:'char-taihou',text:'她的目光短暂落在我身上，随后又转向池水。',required:true,note:note('被留意的一眼','太后似乎留意着我的举动；她的用意尚未说明。')},
{id:'group',name:'妃嫔一侧',x:360,y:680,character:'char-qiguifei',text:'我从人群外围望去，没看见华美人的身影。',required:true,note:note('少了一个人','眼下观鱼的人中，没有看见华美人。未看见不等于知道她去了哪里。')},
{id:'lotus',name:'荷影',x:845,y:765,text:'荷叶的影子随水晃动。找个清静角落，总比往人堆里挤好。',note:note('躲清闲的最佳位置','清静的角落也要留意脚下。','华浅的吐槽','趣闻','故事里的伏笔如何通过环境呈现')}]},
{id:'E3',name:'归宁街市',subtitle:'京城街头 · 晨',map:'street',entry:{x:615,y:1040},exit:'当面问清钱袋之事',intro:'商人的指控说得很响，孩子却一句话也没有。先看证据。',task:'evidence',points:[
{id:'witness',name:'围观者',x:460,y:570,character:'char-innkeeper',text:'“我只见人被打，没亲眼见他拿钱袋。”',required:true,note:note('无人目击','围观者没有亲眼见到偷窃，不能据此认定孩子偷钱。','围观者陈述','证词')},
{id:'purse',name:'乞儿',x:615,y:480,text:'孩子蜷着身子，眼前没有摆出被搜到的钱袋。',required:true,note:note('钱袋尚未出示','目前没有见到被搜出的赃物，应当继续询问而非先定罪。')},
{id:'guard',name:'商人的护院',x:790,y:650,text:'他们听的是商人的吩咐，衣着也不是官差。',required:true,note:note('私下动手','动手的人跟随商人，并非正在办案的官差。')},
{id:'window',name:'半掩的窗',x:445,y:300,text:'窗扇半掩，窗后没有人影。方才那道视线，到底来自哪里？',note:note('谁在看 · 一','我望向酒楼半掩的窗，没有看到人。','华浅亲眼所见','观察','悬疑小说中的不可靠观察')}]},
{id:'E4',name:'华府寻路',subtitle:'华府 · 回廊与书房',map:'court',entry:{x:620,y:1070},exit:'去书房与父亲说话',intro:'不认得路，便先理清要说的话。进书房之前，把手里的论据整理好。',task:'argument',points:[
{id:'family',name:'华夫人',x:590,y:830,character:'char-huafuren',text:'母亲的念叨还在耳边。我与华府一荣俱荣，也会一损俱损。',required:true,note:note('一损俱损','要让父亲改变主意，得从华府的处境说起。','华浅的思考','推断')},
{id:'cousin',name:'回想侧殿',x:450,y:510,text:'华美人在宫中仍想替华家传递消息。她的话，正好能成为开口的引子。',required:true,note:note('先说宫里的事','用已发生的宫中对话开头，比骤然替牧家求情更稳妥。','华浅的思考','推断')},
{id:'shadow',name:'回想明黄身影',x:805,y:515,text:'宫中拐角处的那道明黄身影，提醒我有些话未必只被眼前人听见。',required:true,note:note('有人在听','偷听的可能性值得留意，仍须分清看见了什么与猜到了什么。','华浅的思考','推断')},
{id:'study',name:'书房门',x:635,y:280,text:'书房就在前方。把皇上的疑心与华府的安危连起来，父亲才会认真听。',required:true,note:note('给父亲的理由','从华府自身的利害出发，寻找说服父亲的顺序。','华浅的思考','推断')},
{id:'brother',name:'华深',x:730,y:770,character:'char-huashen',text:'“妹妹！”他隔着院子招手，像有许多话要说。还是先去书房吧。',note:note('兄长在等我','先把正事办完。','华浅的吐槽','趣闻','如何写出立体的反派家庭')}]},
{id:'E5',name:'巡查铺子',subtitle:'京城街市 · 陪嫁铺面',map:'street',entry:{x:610,y:1050},exit:'以明月公子的身份进钱庄',intro:'体面靠人给，退路要自己攒。三本账册，先一一核对。',points:[
{id:'silk',name:'绸缎庄',x:430,y:760,text:'本月入账 480 两，采买 210 两，工钱 90 两。剩下多少？',mini:'accounts-silk',required:true,note:note('绸缎庄账册','480 − 210 − 90 = 180 两。账面核对完毕。','账册核对','观察')},
{id:'rouge',name:'胭脂铺',x:425,y:445,text:'入账 360 两，原料 145 两，工钱 75 两。把余钱记清楚。',mini:'accounts-rouge',required:true,note:note('胭脂铺账册','360 − 145 − 75 = 140 两。账面核对完毕。','账册核对','观察')},
{id:'grain',name:'粮铺',x:815,y:800,text:'入账 650 两，进货 390 两，运费 60 两。余下多少？',mini:'accounts-grain',required:true,note:note('粮铺账册','650 − 390 − 60 = 200 两。账面核对完毕。','账册核对','观察')},
{id:'abacus',name:'算盘',x:800,y:485,text:'珠子各有位置，账目也得各归各处。',note:note('算盘与珠算','珠算通过按规则拨动算珠完成运算。中国珠算于 2013 年列入联合国教科文组织人类非物质文化遗产代表作名录。','UNESCO · Chinese Zhusuan','趣闻','中国珠算 算盘 计算方法')}]},
{id:'E6',name:'酒楼风波',subtitle:'酒楼 · 一层',map:'tavern',entry:{x:628,y:1040},exit:'理清证词，出面处理',intro:'兄长又惹了事。这一次，先听他们怎么说，再带着证据追问。',task:'tavern',points:[
{id:'pipa',name:'琵琶女',x:972,y:686,character:'char-pipa-girl',text:'王妃……小女子只想安生弹曲。',npc:'pipa'},
{id:'blue',name:'蓝衣人',x:858,y:642,character:'char-blue-man',text:'王妃，这事还请容在下分说。',npc:'blue'},
{id:'grey',name:'灰衣人',x:310,y:676,character:'char-grey-man',text:'王妃也是来替华家撑腰的？',npc:'grey'},
{id:'huashen',name:'华深',x:620,y:840,character:'char-huashen',text:'妹妹来得正好，你可要替我说话！',npc:'huashen'},
{id:'keeper',name:'掌柜',x:600,y:443,character:'char-innkeeper',text:'这场争执堵着大堂，客人都围了过来。',npc:'keeper'},
{id:'waiter',name:'店小二',x:1120,y:485,character:'char-waiter',text:'小的只听见这边吵起来，前因不敢乱说。',npc:'waiter'},
{id:'pipa-item',name:'琵琶',x:947,y:717,text:'琵琶被姑娘紧紧抱在怀里。先听清她自己的意愿，不能让别人替她决定。',note:note('她自己的意愿','处理争执时，当事人的明确意愿应被听见。','华浅的思考','推断','如何在冲突中听见当事人的声音')}]},
{id:'E7',name:'后宫日常',subtitle:'太后宫前 · 午后',map:'court',entry:{x:620,y:1070},exit:'回到太后身边',intro:'人人都愿意说上几句，但每句话都有它的位置。先听，慢些下结论。',points:[
{id:'li',name:'李美人',x:450,y:510,character:'char-limeiren',text:'她说起卫美人，语气立刻冷了下来。',required:true,note:note('不合的两人','李美人与卫美人言语不对付。','宫中观察','观察')},
{id:'wei',name:'卫美人',x:805,y:510,character:'char-weimeiren',text:'她并不肯让李美人独占话头。',required:true,note:note('另一种说法','只听一边，很容易忽略另一人的立场。','华浅的思考','推断')},
{id:'qi',name:'戚贵妃',x:635,y:280,character:'char-qiguifei',text:'“她们两个一见面就掐，最头疼的还是太后。”',required:true,note:note('太后的头疼','两人的争执，让旁人也不得清静。','戚贵妃陈述','证词')},
{id:'tea',name:'茶点桌',x:730,y:785,text:'茶点齐全，就差一把瓜子。',mini:'tea',note:note('就差一把瓜子','人在宫中，旁观也并非总能置身事外。','华浅的吐槽','趣闻','宫斗小说中的旁观者视角')}]},
{id:'E8',name:'病榻半月',subtitle:'晋王府 · 静养',map:'bedroom-day',entry:{x:650,y:880},exit:'继续这段养病日子',intro:'窗外的日子一天天过去，药碗却总是准时送来。',points:[
{id:'window-day1',name:'第一日',x:680,y:350,text:'初病，窗外仍有人走动。先把这一日熬过去。',required:true,mini:'medicine'},
{id:'window-day2',name:'第三日',x:800,y:485,text:'千芷又捧来了药碗。门口的脚步停了又走。',required:true,mini:'medicine'},
{id:'window-day3',name:'第六日',x:825,y:820,text:'花盆似乎少了些精神。我的小动作也太明显了。',required:true,mini:'medicine'},
{id:'window-day4',name:'第十日',x:350,y:790,text:'天色亮了又暗，药碗还是同一个模样。',required:true,mini:'medicine'},
{id:'window-day5',name:'第十五日',x:615,y:610,text:'半个月过去，该重新面对外头的事了。',required:true,mini:'medicine'},
{id:'qianzhi',name:'千芷',x:430,y:910,character:'char-qianzhi',text:'王妃还是好好歇着。故事里的小把戏，可不是治病的法子。',note:note('窗外与药碗','这段是角色的虚构行为，不是健康建议。别把小说里的拖病小把戏当作现实方法。','游戏旁注','趣闻','小说中的人物行为与现实判断')}]},
{id:'E9',name:'生辰备宴',subtitle:'晋王府 · 琴室与廊下',map:'music',entry:{x:740,y:770},exit:'花厅就绪，入席',intro:'琴棋书画我都不擅长，眼前的安排总要先妥当。',points:[
{id:'zither',name:'摆好名琴',x:770,y:490,text:'千芷寻来的琴放在这里。位置妥当，才不误开宴。',required:true,mini:'place-zither',note:note('名琴已备','名琴已在花厅摆好，稍后可请人演奏。')},
{id:'invite',name:'牧遥',x:360,y:430,character:'char-muyao',text:'她在廊下，目光带着戒备。先记下她的位置，入席时再开口邀请。',required:true,note:note('牧遥在廊下','找到了牧遥，稍后在宴席上提出请她弹琴。')},
{id:'kitchen',name:'厨房食材',x:700,y:780,text:'厨房备着面粉和高汤。若要亲手下厨，东西倒很齐全。',required:true,note:note('灶上有面粉与高汤','东西齐全，心里便有了底。')},
{id:'qianzhi',name:'千芷',x:800,y:650,character:'char-qianzhi',text:'王妃，别忘了名琴。今日可要让王爷高兴。'},
{id:'moon',name:'庭中树影',x:380,y:760,text:'枝叶轻摇，一时听不到外头的喧闹。',note:note('偷得片刻清闲','先把自己的心安顿好，再去面对一席人的目光。','华浅的吐槽','趣闻','角色如何在剧情压力中作出自己的选择')}]}
];
const anchors:Record<string,string>={'s1-00-bath-b003':'E1','s1-04-b003':'E2','s1-08-b019':'E3','s1-09-b013':'E4','s2-01-b003':'E5','s2-03-b007':'E6','s2-06-b005':'E7','s2-08-b006':'E8','s2-09-b006':'E9'};
export function segmentForBlock(_fragment:string,id:string,_variables:Record<string,unknown>){return segments.find(s=>s.id===anchors[id]);}
