import React from "react";
import {
    Alert,
    Avatar,
    Button,
    Footer,
    FormLayout,
    FormStatus,
    Header,
    HorizontalScroll,
    Input,
    Link,
    Panel,
    PanelHeader,
    PanelHeaderBack,
    PanelHeaderContent,
    Placeholder,
    ScreenSpinner,
    SimpleCell,
    Slider,
    Tappable,
    View,
} from "@vkontakte/vkui";
import './GameNvuti.scss';
import SystemFunctions from "../../../SystemFunctions";
import Icon24DoneOutline from '@vkontakte/icons/dist/24/done_outline';
import Icon56ErrorOutline from '@vkontakte/icons/dist/56/error_outline';
import IconVkCoin from '../../../img/icon_vkcoin';
import IconWC from '../../../img/icon_wc';
import Socket from "../../../Socket";
import Server from "../../../Server";
import CountUp from "react-countup";
import IconCorona from '../../../img/icon_corona';
import IconPaper from '../../../img/icon_paper';
import IconBonus from '../../../img/icon_bonus';

const COINS_ICONS = {
    wc: IconWC,
    coins: IconVkCoin,
    corona: IconCorona,
    paper: IconPaper,
    bonus: IconBonus,
};

export default class GameNvuti extends React.Component {

    rid = -1;
    socket = null;
    reqGetUsers = false;
    isSendAction = false;

    constructor(props) {
        super(props);

        let sFreeToken = SystemFunctions.getStaticVar('freeToken');
        let sUserData = SystemFunctions.getStaticVar('userData');

        this.state = {
            popout: null,
            activePanel: 'game',
            activeModal: null,

            token: sFreeToken == null ? null : sFreeToken,
            userData: sUserData == null ? null : sUserData,
            gameData: null,
            usersVkData: {},

            inputSend: '',
            inputSendError: '',
            targetBet: 0,
            v: 50,
            coef: 1.9,
        };
        this.connect();
        this.setAWCS();
    }

    setAWCS = () => {
        let hidden, visibilityChange;
        if (typeof document.hidden !== "undefined") {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        } else if (typeof document.msHidden !== "undefined") {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
        } else if (typeof document.webkitHidden !== "undefined") {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }
        if (typeof document.addEventListener === "undefined" || hidden === undefined) {
            // Error enable AWCS
        } else {
            document.addEventListener(visibilityChange, () => {
                if (document[hidden]) {
                    if (this.state.socket != null) {
                        this.socket.disconnect();
                    }
                    this.leave();
                }
            }, false);
        }
    }

    connect = () => {
        this.socket = new Socket();

        this.socket.onMsg = this.onMessage;
        this.socket.onDisc = this.onDisconnect;
        this.socket.connect({game: 3}, () => {
            this.setState({
                popout: null,
                activePanel: 'error',
                panelErrorText: 'Ошибка подключения! Попробуйте чуть позже...'
            });
        });
    }

    componentDidMount() {
        this.showLoading();
    }

    componentWillUnmount() {
        if (this.socket != null) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    renderBalanceBlock = () => {
        let sc = SystemFunctions.getStaticVar('sCoin');
        const SIcon = COINS_ICONS[sc];
        return (<div className='balanceBlock'>
            <div className='verticalText'>Ваш баланс: {SystemFunctions.formatNumber(this.state.userData[sc], 0)}</div>
            <SIcon width={18} height={18} className='coinIcon'/>
        </div>);
    }

    renderHistory = () => {
        if (this.state.gameData == null) {
            return null;
        }
        let ret = [];
        for (let i = 0; i < this.state.gameData.history.length; i++) {
            let v = this.state.gameData.history[i];
            let hv = this.state.gameData.historyHash[i];
            let t = 1;
            if (v < 7) {
                t = 0;
            } else if (v > 7) {
                t = 2;
            }
            ret.push(<div className={'item ' + t} onClick={() => this.setState({
                'popout':
                    <Alert
                        actions={[
                            {
                                title: 'СКОПИРОВАТЬ',
                                action: () => Server.copyText(hv[1] + '@' + v),
                                mode: 'default'
                            },
                            {
                                title: 'ЗАКРЫТЬ',
                                autoclose: true,
                                mode: 'default'
                            }]}
                        onClose={this.closePopout}
                    >
                        <h2>Хеш игры</h2>
                        <p>Результат игры: <b>{v}</b></p>
                        <p>Строка для проверки: <b>{hv[1]}@{v}</b></p>
                        <p>Хеш результата: <b>{hv[0]}</b></p>
                        <p>Для проверки скопируйте строку и вставьте на любом сайте для хешировния по технологии md5
                            (например <Link href='https://decodeit.ru/md5'>тут</Link>). Если полученный хеш совпадает с
                            указанным в этом окне, то игра была честной.</p>
                    </Alert>
            })}>
                <div>{v}</div>
            </div>);
        }
        if (ret.length < 1) {
            return null;
        }
        return (<div className='history'>
            <Header mode={'secondary'}>ИСТОРИЯ ИГР</Header>
            <HorizontalScroll className='wrapper'>
                {ret}
            </HorizontalScroll>
        </div>);
    }

    renderButtonsBlock = () => {
        if (this.state.gameData == null) {
            return null;
        }
        if (this.state.gameData.result != null) {
            let coef = SystemFunctions.round(100 / this.state.gameData.result.v * 0.95, 2);
            const SIcon = COINS_ICONS[SystemFunctions.getStaticVar('sCoin')];
            return (<div className='buttonsBlock'>
                <FormLayout className='form'>
                    <FormStatus className='winStatus'
                                header={this.state.gameData.result.win > 0 ? "Вы выиграли" : "Вы проиграли"}
                                mode={this.state.gameData.result.win > 0 ? "default" : "error"}>
                        <div
                            className='verticalText'>{this.state.gameData.result.win > 0 ? SystemFunctions.formatNumber(this.state.gameData.result.win) : SystemFunctions.formatNumber(this.state.gameData.result.bet)}</div>
                        <SIcon className='vkIcon' width={12} height={12}/>
                        {this.state.gameData.result.win > 0 ?
                            <div style={{paddingLeft: '5px'}} className='verticalText'> (x{coef})</div> : null}
                    </FormStatus>
                    <Button size="xl" onClick={this.onButtonContinue}
                            before={<Icon24DoneOutline/>}>Продолжить</Button>
                </FormLayout>
            </div>);
        }
        let maxBet = this.state.userData.coins;
        if (maxBet > this.state.gameData.maxBet) {
            maxBet = this.state.gameData.maxBet;
        }
        let targetMin = this.state.v * 10000 - 1;
        let targetMax = 1000000 - this.state.v * 10000;
        return (<div className='buttonsBlock'>
            <FormLayout className='form'>
                <div className='betButtons'>
                    <Tappable className='betButton b1' size="l"
                              onClick={() => this.setState({inputSend: Math.floor(this.state.userData[SystemFunctions.getStaticVar('sCoin')] / 4)})}>1/4</Tappable>
                    <Tappable className='betButton b2' size="l"
                              onClick={() => this.setState({inputSend: Math.floor(this.state.userData[SystemFunctions.getStaticVar('sCoin')] / 3)})}>1/3</Tappable>
                    <Tappable className='betButton b3' size="l"
                              onClick={() => this.setState({inputSend: Math.floor(this.state.userData[SystemFunctions.getStaticVar('sCoin')] / 2)})}>1/2</Tappable>
                    <Tappable className='betButton b4' size="l"
                              onClick={() => this.setState({inputSend: Math.floor(this.state.userData[SystemFunctions.getStaticVar('sCoin')])})}>ALL</Tappable>
                </div>
                <div className='inputBetWrapper'>
                    <FormLayout className='form'>
                        <Input className='inputBet'
                               placeholder={"Ваша ставка"}
                               inputmode="numeric"
                               value={SystemFunctions.isNumeric(this.state.inputSend) ? SystemFunctions.formatNumber(this.state.inputSend, 0) : this.state.inputSend}
                               alignment="center"
                               onChange={(e) => {
                                   let v = '' + e.target.value;
                                   v = v.replace(/[^0123456789]/g, '');
                                   if (v !== '' && !SystemFunctions.isNumeric(v)) {
                                       return;
                                   }
                                   if (v > 100000000000) {
                                       v = 100000000000;
                                   }
                                   if (v > this.state.userData[SystemFunctions.getStaticVar('sCoin')]) {
                                       v = this.state.userData[SystemFunctions.getStaticVar('sCoin')];
                                   }
                                   if (v <= 0) {
                                       v = '';
                                   }
                                   this.setState({
                                       inputSendError: '',
                                       inputSend: v,
                                   });
                               }}
                               status={this.state.inputSendError === '' ? 'default' : 'error'}
                               bottom={this.state.inputSendError === '' ? '' : this.state.inputSendError}/>
                    </FormLayout>
                    <div className='mbWrapper'>
                        <div className='mb n1' onClick={() => this.setState({inputSend: Math.floor(this.state.inputSend / 2), inputSendError: ''})}>/2</div>
                        <div className='mb n2' onClick={() => this.setState({inputSend: Math.floor(this.state.inputSend * 2), inputSendError: ''})}>x2</div>
                    </div>
                </div>
                <div className='targetButtons'>
                    <Tappable className={'button b1' + (this.state.targetBet === 0 ? ' a' : '')}
                              activeEffectDelay={0}
                              onClick={() => this.setState({targetBet: 0})}>
                        <div className='title'>Меньше</div>
                        <div className='desc'>0 - {SystemFunctions.formatNumber(targetMin)}</div>
                    </Tappable>
                    <Tappable className={'button b2' + (this.state.targetBet === 1 ? ' a' : '')}
                              activeEffectDelay={0}
                              onClick={() => this.setState({targetBet: 1})}>
                        <div className='title'>Больше</div>
                        <div className='desc'>{SystemFunctions.formatNumber(targetMax)} - 999 999</div>
                    </Tappable>
                </div>
                <Button size="xl" onClick={this.onButtonBet}
                        before={<Icon24DoneOutline/>}>Поставить</Button>
            </FormLayout>
        </div>);
    }

    renderTable = () => {
        if (this.state.gameData == null || this.state.gameData.result == null) {
            return (<div className='table'>
                <div className='info'>
                    <div className='v'>
                        <div className='title'>Вероятность</div>
                        <div className='value'>{this.state.v}%</div>
                    </div>
                    <div className='coef'>
                        <div className='title'>Коэффициент</div>
                        <div className='value'>x{SystemFunctions.formatNumber(this.state.coef, 2)}</div>
                    </div>
                </div>
                <FormLayout className='switchWrapper'>
                    <Slider
                        min={1}
                        max={85}
                        step={1}
                        value={this.state.v}
                        onChange={v => this.setState({v: v, coef: SystemFunctions.round(100 / v * 0.95, 2)})}
                        defaultValue={this.state.betSlider}
                    />
                </FormLayout>
            </div>);
        } else {
            let targetMin = this.state.v * 10000 - 1;
            let targetMax = 1000000 - this.state.v * 10000;
            return (<div className='table'>
                <CountUp className='number' duration={2} separator=' ' end={this.state.gameData.result.number}/>
                <div
                    className={'planNumber ' + (this.state.gameData.result.win > 0 ? 'win' : 'lose')}>{this.state.gameData.result.t === 0 ? '1 - ' + SystemFunctions.formatNumber(targetMin) : SystemFunctions.formatNumber(targetMax) + ' - 999 999'}</div>
            </div>);
        }
    }

    renderUsers = () => {
        if (this.state.gameData == null || this.state.gameData.history == null || this.state.gameData.result != null) {
            return null;
        }
        let ret = [];
        for (let i = 0; i < this.state.gameData.history.length; i++) {
            let uid = this.state.gameData.history[i][0];
            let number = this.state.gameData.history[i][1];
            let v = this.state.gameData.history[i][2];
            let cy = this.state.gameData.history[i][3];
            let bet = this.state.gameData.history[i][4];
            let t = this.state.gameData.history[i][5];
            let color = this.state.gameData.history[i][6];
            let nameServer = this.state.gameData.history[i][7];
            let crown = this.state.gameData.history[i][8];
            let win = 0;
            let coef = SystemFunctions.round(100 / v * 0.95, 2);
            const targetMin = v * 10000;
            const targetMax = 1000000 - v * 10000;
            if ((t === 0 && targetMin > number) || (t === 1 && targetMax <= number)) {
                win = Math.floor(coef * bet);
            }
            let name = '@' + uid;
            let photo = null;
            if (this.state.usersVkData[uid] == null) {
                this.getUsersInfo();
            } else {
                name = this.state.usersVkData[uid].first_name + ' ' + this.state.usersVkData[uid].last_name;
                photo = this.state.usersVkData[uid].photo_100;
            }
            let hv = this.state.gameData.historyHash[i];

            if (nameServer != null) {
                name = nameServer;
            }
            if (color == null) {
                color = 0;
            }
            const SIcon = COINS_ICONS[cy];
            ret.push(<SimpleCell className='betCell' before={<Avatar size={40} src={photo}
                                                                     onClick={() => SystemFunctions.openTab("https://vk.com/id" + uid)}>{crown != null && crown > 0 ? <div className='crown'>{crown}</div> : null}</Avatar>}
                                 description={win > 0 ? <span
                                         style={{'color': '#56be7e'}}><div
                                         className='verticalText'>+ {SystemFunctions.formatNumber(win)}</div><SIcon
                                         width={12} height={12} className='vkIcon'/></span> :
                                     <span
                                         style={{'color': '#ee5e55'}}><div
                                         className='verticalText'>- {SystemFunctions.formatNumber(bet)}</div><SIcon
                                         width={12} height={12} className='vkIcon'/></span>}
                                 indicator={<div className={'betCoef ' + (win > 0 ? 'win' : 'lose')}>{v}%</div>}
                                 onClick={() => this.setState({
                                     'popout':
                                         <Alert
                                             actions={[
                                                 {
                                                     title: 'СКОПИРОВАТЬ',
                                                     action: () => Server.copyText(hv[1] + '@' + number),
                                                     mode: 'default'
                                                 },
                                                 {
                                                     title: 'ЗАКРЫТЬ',
                                                     autoclose: true,
                                                     mode: 'default'
                                                 }]}
                                             onClose={this.closePopout}
                                         >
                                             <h2>Хеш игры</h2>
                                             <p>Результат игры: <b>{number}</b></p>
                                             <p>Строка для проверки: <b>{hv[1]}@{number}</b></p>
                                             <p>Хеш результата: <b>{hv[0]}</b></p>
                                             <p>Для проверки скопируйте строку и вставьте на любом сайте для хешировния
                                                 по технологии md5
                                                 (например <Link href='https://decodeit.ru/md5'>тут</Link>). Если
                                                 полученный хеш совпадает с
                                                 указанным в этом окне, то игра была честной.</p>
                                         </Alert>
                                 })}><div className={'usersColorsBase-' + color}>{name}</div></SimpleCell>);
        }
        return ret;
    }

    renderHash = () => {
        if (this.state.gameData == null) {
            return null;
        }
        if (this.state.gameData.result == null) {
            return <Footer>Hash: {this.state.gameData.hash}</Footer>
        } else {
            return <Footer onClick={() => this.setState({
                'popout':
                    <Alert
                        actions={[
                            {
                                title: 'СКОПИРОВАТЬ',
                                action: () => Server.copyText(this.state.gameData.result.hashPass + '@' + (this.state.gameData.result.number)),
                                mode: 'default'
                            },
                            {
                                title: 'ЗАКРЫТЬ',
                                autoclose: true,
                                mode: 'default'
                            }]}
                        onClose={this.closePopout}
                    >
                        <h2>Хеш игры</h2>
                        <p>Результат игры: <b>{this.state.gameData.result.number}</b></p>
                        <p>Строка для
                            проверки: <b>{this.state.gameData.result.hashPass}@{this.state.gameData.result.number}</b>
                        </p>
                        <p>Хеш результата: <b>{this.state.gameData.hash}</b></p>
                        <p>Для проверки скопируйте строку и вставьте на любом сайте для хешировния по технологии md5
                            (например <Link href='https://decodeit.ru/md5'>тут</Link>). Если полученный хеш
                            совпадает с
                            указанным в этом окне, то игра была честной.</p>
                    </Alert>
            })}>Hash: {this.state.gameData.hash}<br/>Check
                md5: {this.state.gameData.result.hashPass}@{this.state.gameData.result.number}
            </Footer>
        }
    }

    render() {
        return (
            <View className='gameNvuti' activePanel={this.state.activePanel} popout={this.state.popout} header={true}>
                <Panel id='game'>
                    <PanelHeader>
                        <PanelHeaderContent before={<PanelHeaderBack onClick={this.leave}/>}>
                            Nvuti
                        </PanelHeaderContent>
                    </PanelHeader>
                    <div className='gameContent'>
                        <div className='paddingWrapper'>
                            {this.renderBalanceBlock()}
                            {this.renderTable()}
                        </div>
                        {this.renderButtonsBlock()}
                        {this.renderHash()}
                        {this.renderUsers()}
                    </div>
                </Panel>
                <Panel id='error'>
                    <PanelHeader>
                        <PanelHeaderContent before={<PanelHeaderBack onClick={() => this.props.go('home')}/>}>
                            Ошибка
                        </PanelHeaderContent>
                    </PanelHeader>
                    <Placeholder
                        icon={<Icon56ErrorOutline style={{color: '#ef5350'}}/>}
                        action={<Button size="l" mode="tertiary" onClick={() => {
                            this.setState({activePanel: 'game'});
                            this.connect();
                        }}>Повторить попытку</Button>}
                        stretched
                    >
                        {this.state.panelErrorText}
                    </Placeholder>
                </Panel>
            </View>
        );
    }

    onInputChangeBet = () => {
        this.setState({betAlertType: '', betAlertText: ''});
    }

    onButtonBet = () => {
        if (this.state.gameData == null) {
            return;
        }
        let sum = parseFloat(this.state.inputSend);
        if (sum == null || sum < 1) {
            this.setState({inputSendError: 'Ставка должна быть не менее 1!'});
            return;
        }
        this.socket.send({
            type: 'action',
            a: 'setBet',
            t: this.state.targetBet,
            v: this.state.v,
            cy: SystemFunctions.getStaticVar('sCoin'),
            bet: sum,
        });
    }

    onButtonGetBet = () => {
        if (this.state.gameData == null) {
            return;
        }
        this.socket.send({
            type: 'action',
            a: 'getBet',
        });
    }

    onButtonContinue = () => {
        if (this.state.gameData == null) {
            return;
        }
        this.socket.send({
            type: 'action',
            a: 'continue',
        });
    }

    onMessage = (msg) => {
        this.isSendAction = false;
        switch (msg.type) {
            case 'init':
                this.closePopout();
                if (msg.status) {
                    this.rid = msg.roomId;
                    this.socket.send({
                        type: 'join',
                        room: 0,
                    });
                }
                break;
            case 'update':
                if (msg.balance != null) {
                    let ud = this.state.userData;
                    for (const key in msg.balance) {
                        ud[key] = msg.balance[key];
                    }
                    SystemFunctions.saveStaticVar('userData', ud);
                    this.setState({
                        userData: ud,
                    });
                }
                this.setState({
                    gameData: msg,
                });
                break;
            case 'setBet':
                if (!msg.status) {
                    this.setState({
                        inputSendError: msg.error,
                    })
                }
                break;
            case 'timer':
                this.setState({stateText: msg.timer});
                break;
            case 'balance':
                let ud = this.state.userData;
                if (msg.balance == null) {
                    break;
                }
                for (const key in msg.balance) {
                    ud[key] = msg.balance[key];
                }
                SystemFunctions.saveStaticVar('userData', ud);
                this.setState({
                    userData: ud,
                })
                break;
        }
    }

    onDisconnect = () => {
        this.setState({
            popout: null,
            activePanel: 'error',
            panelErrorText: 'Соединение с сервером разорвано! Попробуйте подключиться еще раз'
        });
        this.socket = null;
    }

    changePopout = (p) => {
        this.setState({popout: p})
    }

    leave = () => {
        //this.props.go('home');
        window.history.back();
    }

    getUsersInfo = () => {
        if (this.reqGetUsers) {
            return;
        }
        this.reqGetUsers = true;
        if (this.state.token == null) {
            Server.getUserToken('', (r) => {
                let token = r.access_token;
                SystemFunctions.saveStaticVar('freeToken', token);
                this.reqGetUsers = false;
                this.setState({
                    token: token,
                });
            }, (e) => {
                this.reqGetUsers = false;
                //TODO: alert('Невозможно получить доступ!')
            })
        } else {
            let users = [];
            let gu = '';

            if (this.state.gameData != null && this.state.gameData.history != null) {
                for (let i in this.state.gameData.history) {
                    let uid = this.state.gameData.history[i][0];
                    if (!SystemFunctions.in_array(users, uid)) {
                        gu += ',' + uid;
                        users.push(uid);
                    }
                }
            } else {
                this.reqGetUsers = false;
                return;
            }

            Server.callApiUser(
                {
                    'method': 'users.get',
                    'params': {
                        user_ids: gu,
                        access_token: this.state.token,
                        fields: 'photo_100',
                        v: '5.100',
                    }
                },
                ((response) => {
                    this.reqGetUsers = false;
                    let r = response.response;

                    let toSave = {};
                    for (let i = 0; i < r.length; i++) {
                        toSave[r[i].id] = r[i];
                    }
                    this.setState({
                        usersVkData: toSave,
                    });
                }),
                () => {
                    this.reqGetUsers = false;
                }
            );
        }
    }

    showLoading = () => {
        this.setState({popout: <ScreenSpinner/>});
    }

    closePopout = () => {
        this.setState({popout: null});
    }
}
