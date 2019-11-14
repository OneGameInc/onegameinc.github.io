(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Created by qinning on 15/4/14.
 */
var VERSION_ASSET_ID = "@version";
var MANIFEST_ASSET_ID = "@manifest";
var AssetsManager = cc.Class.extend({
    /**
     * {jsb.AssetsManager}
     */
    _am : null,
    /**
     * {number}失败次数
     */
    _failCount : 0,
    /**
     * {number}最大错误重试次数
     */
    _maxFailCount : 1,
    ctor:function(){

    },
    purge:function() {
        if(this._am){
            this._am.release();
        }
        this._am = null;
    },

    retryDownAssets: function () {
        this._failCount = 0;
        this._maxFailCount = 5;
        if(this._am) {
            this._am.downloadFailedAssets();
        }
    },

    downLoadAssets : function(projectManifestPath,storagePath,updateCallBack,endCallBack) {
        this._failCount = 0;
        this._maxFailCount = 5;
        this._am = new jsb.AssetsManager(projectManifestPath, storagePath);
        this._am.retain();
        if (!this._am.getLocalManifest().isLoaded()) {
            endCallBack("error_local_manifest_not_loaded");
            return;
        }
        var that = this;
        var listener = new jsb.EventListenerAssetsManager(this._am, function (event) {
            switch (event.getEventCode()) {
                case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                    var msg = event.getMessage();
                    cc.log("UPDATE_PROGRESSION:" + msg);
                    var assetId = event.getAssetId();
                    cc.log("assetId:"+assetId);
                    if(assetId == VERSION_ASSET_ID || assetId == MANIFEST_ASSET_ID) {
                        updateCallBack(1, "update manifest");
                    } else {
                        updateCallBack(event.getPercent(), msg);
                    }
                    break;
                case jsb.EventAssetsManager.UPDATE_FAILED:
                    cc.log("Update failed. " + event.getMessage());
                    that._failCount++;
                    if (that._failCount < that._maxFailCount) {
                        that._am.downloadFailedAssets();
                    }
                    else {
                        cc.log("Reach maximum fail count, exit update process");
                        that._failCount = 0;
                        endCallBack(event.getEventCode());
                    }
                    break;
                case jsb.EventAssetsManager.UPDATE_FINISHED:
                case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                    endCallBack(null);
                    break;

                case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                    cc.log("No local manifest file found, skip assets update.");
                    endCallBack(event.getEventCode());
                    break;
                case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                    endCallBack(event.getEventCode());
                    cc.log("Fail to download manifest file, update skipped.");
                    break;
                case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                    endCallBack(event.getEventCode());
                    cc.log("Fail to parse manifest file, update skipped.");
                    break;
                case jsb.EventAssetsManager.ERROR_UPDATING:
                    cc.log("Asset update error: " + event.getMessage());
                    endCallBack(event.getEventCode());
                    break;
                case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                    cc.log(event.getMessage());
                    endCallBack(event.getEventCode());
                    break;
                default:
                    cc.log("default: " + event.getEventCode());
                    break;
            }
        });

        cc.eventManager.addListener(listener, 1);
        this._am.update();
    }
});

AssetsManager._instance = null;
AssetsManager._firstUseInstance = true;

/**
 *
 * @returns {AssetsManager}
 */
AssetsManager.getInstance = function () {
    if (AssetsManager._firstUseInstance) {
        AssetsManager._firstUseInstance = false;
        AssetsManager._instance = new AssetsManager();
    }
    return AssetsManager._instance;
};


module.exports = AssetsManager;
},{}],2:[function(require,module,exports){
/**
 * Created by qinning on 15/4/27.
 */


var AudioEngineWrapper = {
    //Used for native
    _musicId: -1,
    _musicVolume: 1.0,
    _effectVolume: 1.0,
    _audioIdMap: {},

    useJsbAudioEngine: function() {
        return (cc.sys.isNative);
    },

    getMusicVolume: function () {
        var volume = 0;
        if (this.useJsbAudioEngine()) {
            volume = this._musicVolume;
        } else {
            volume = cc.audioEngine.getMusicVolume();
        }
        return volume;
    },

    setMusicVolume: function (volume) {
        if (this.useJsbAudioEngine()) {
            this._musicVolume = volume;
            jsb.AudioEngine.setVolume(this._musicId, volume);
        } else {
            cc.audioEngine.setMusicVolume(volume);
        }
    },

    getEffectsVolume: function () {
        var volume;
        if (this.useJsbAudioEngine()) {
            volume = this._effectVolume;
        } else {
            volume = cc.audioEngine.getEffectsVolume();
        }
        return volume;
    },

    setEffectsVolume: function (volume) {
        if (this.useJsbAudioEngine()) {
            this._effectVolume = volume;
            var audioIds = Object.keys(this._audioIdMap);
            audioIds.forEach (function (audioId) {
                jsb.AudioEngine.setVolume(parseInt(audioId), volume);
            });
        } else {
            cc.audioEngine.setEffectsVolume(volume);
        }
    },

    playEffect: function (url, loop) {
        var audioId;
        if (this.useJsbAudioEngine()) {
            audioId = jsb.AudioEngine.play2d(url, loop, this._effectVolume);
            this._audioIdMap[audioId] = audioId;
        } else {
            audioId = cc.audioEngine.playEffect(url, loop);
        }
        return audioId;
    },

    stopEffect: function (audioId) {
        if (this.useJsbAudioEngine()) {
            this._nativeStopAudio(audioId);
            delete this._audioIdMap[audioId];
        } else {
            cc.audioEngine.stopEffect(audioId);
        }
    },

    stopAllEffects: function () {
        if (this.useJsbAudioEngine()) {
            var audioIds = Object.keys(this._audioIdMap);
            var self = this;
            audioIds.forEach(function (audioId) {
                self._nativeStopAudio(audioId);
            });
            this._audioIdMap = {};
        } else {
            cc.audioEngine.stopAllEffects();
        }
    },

    playMusic: function (url, loop) {
        if (this.useJsbAudioEngine()) {
            if (-1 !== this._musicId) {
                this._nativeStopAudio(this._musicId);
            }
            this._musicId = jsb.AudioEngine.play2d(url, loop, this._musicVolume);
        } else {
            cc.audioEngine.playMusic(url, loop);
        }
    },

    isMusicPlaying: function () {
        var result;
        if (this.useJsbAudioEngine()) {
            result = (jsb.AudioEngine.getState(this._musicId) === 1);
        } else {
            result = cc.audioEngine.isMusicPlaying();
        }
        return result;
    },

    resumeMusic: function () {
        if (this.useJsbAudioEngine()) {
            jsb.AudioEngine.resume(this._musicId);
        } else {
            cc.audioEngine.resumeMusic();
        }
    },

    pauseMusic: function () {
        if (this.useJsbAudioEngine()) {
            jsb.AudioEngine.pause(this._musicId);
        } else {
            cc.audioEngine.pauseMusic();
        }
    },

    _nativeStopAudio: function (audioId) {
        jsb.AudioEngine.stop(audioId);
    },

    stopMusic: function () {
        if (this.useJsbAudioEngine()) {
            this._nativeStopAudio(this._musicId);
            this._musicId = -1;
        } else {
            cc.audioEngine.stopMusic();
        }
    },

    preloadEffect: function (effectName) {
        if (this.useJsbAudioEngine()) {
            jsb.AudioEngine.preload(effectName);
        }
    },

    unloadEffect: function (effectName) {
        if (this.useJsbAudioEngine()) {
            jsb.AudioEngine.uncache(effectName);
        }
    }
};

var ACTION_TYPE = {
    ACTION_NULL: 0,
    ACTION_PAUSE: 1,
    ACTION_RESUME: 2
};

var PLAY_TYPE = {
    PLAY_TYPE_NORMAL: 0,
    PLAY_TYPE_FADE_OUT_FADE_IN: 1
};

var AudioPlayer = cc.Class.extend({
    lastMusicVolume: 0,
    suffix: null,
    effectMap: null,
    playType: PLAY_TYPE.PLAY_TYPE_NORMAL,
    actionType: ACTION_TYPE.ACTION_NULL,
    musicName: null,
    loop: false,
    ctor: function () {
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            this.suffix = "res/audio_ogg/%s.ogg";
        } else {
            this.suffix = "res/audio_mp3/%s.mp3";
        }
        this.effectMap = {};
        var isMusicOn = this.isMusicOn();
        this.lastMusicVolume = 1;
        this.setMusicOn(isMusicOn);
    },

    beginSchedule: function () {
        cc.director.getScheduler().scheduleCallbackForTarget(this, this.update, 0.1, cc.REPEAT_FOREVER, 0, false);
    },

    stopSchedule: function () {
        cc.director.getScheduler().unscheduleCallbackForTarget(this, this.update);
    },

    update: function (dt) {
        dt *= 0.5;
        var isFinish = false;
        var volume = cc.audioEngine.getMusicVolume();
        if (this.playType == PLAY_TYPE.PLAY_TYPE_FADE_OUT_FADE_IN) {
            if (volume > 0.001) {
                if (this.actionType == ACTION_TYPE.ACTION_PAUSE) {
                    volume -= dt;
                    if (volume < 0.001) {
                        volume = 0.01;
                        this.playMusicByKey(this.musicName, this.loop);
                        this.actionType = ACTION_TYPE.ACTION_RESUME;
                    }
                    cc.audioEngine.setMusicVolume(volume);
                } else if (this.actionType == ACTION_TYPE.ACTION_RESUME) {
                    volume += dt;
                    if (volume > 0.99) {
                        volume = 0.99;
                        isFinish = true;
                    }
                    cc.audioEngine.setMusicVolume(volume);
                }
            } else {
                this.playMusicByKey(this.musicName, this.loop);
            }
            if (isFinish) {
                this.actionType = ACTION_TYPE.ACTION_NULL;
                this.playType = PLAY_TYPE.PLAY_TYPE_NORMAL;
                this.stopSchedule();
            }
        } else {
            if (volume > 0.001) {
                if (this.actionType == ACTION_TYPE.ACTION_PAUSE) {
                    volume -= dt;
                    if (volume < 0.001) {
                        volume = 0.01;
                        isFinish = true;
                        this.pauseMusic();
                    }
                    cc.audioEngine.setMusicVolume(volume);
                } else if (this.actionType == ACTION_TYPE.ACTION_RESUME) {
                    volume += dt;
                    if (volume > 0.99) {
                        volume = 0.99;
                        isFinish = true;
                    }
                    cc.audioEngine.setMusicVolume(volume);
                }
            } else {
                isFinish = true;
            }
            if (isFinish) {
                this.actionType = ACTION_TYPE.ACTION_NULL;
                this.stopSchedule();
            }
        }
    },

    playEffectByKey: function (effectName, loop) {
        if (!this.isEffectOn()) {
            return;
        }
        var fileName = game.utils.sprintf(this.suffix, effectName);
        var key = "";
        if (cc.sys.isNative) {
            if (jsb.fileUtils.isFileExist(fileName)) {
                key = AudioEngineWrapper.playEffect(fileName, loop);
            } else {
                cc.log(game.utils.sprintf("effect file %s not found", fileName));
            }
        } else {
            if (cc.loader.getRes(fileName)) {
                key = AudioEngineWrapper.playEffect(fileName, loop);
            }
        }
        if (key) {
            this.effectMap[fileName] = key;
        }
    },

    playMusicByKey: function (musicName, loop) {
        this.actionType = ACTION_TYPE.ACTION_NULL;
        this.playType = PLAY_TYPE.PLAY_TYPE_NORMAL;
        if (this.isMusicOn()) {
            if (this.lastMusicVolume != 0) {
                AudioEngineWrapper.setMusicVolume(this.lastMusicVolume);
            } else {
                AudioEngineWrapper.setMusicVolume(1);
            }
        }
        var fileName = game.utils.sprintf(this.suffix, musicName);
        if (cc.sys.isNative) {
            if (jsb.fileUtils.isFileExist(fileName)) {
                AudioEngineWrapper.playMusic(fileName, loop);
            } else {
                cc.log(game.utils.sprintf("music file %s not found", fileName));
            }
        } else {
            if (cc.loader.getRes(fileName)) {
                AudioEngineWrapper.playMusic(fileName, loop);
            }
        }
    },

    isPlayingMusic: function () {
        return AudioEngineWrapper.isMusicPlaying();
    },

    resumeMusic: function () {
        AudioEngineWrapper.resumeMusic();
    },

    resumeMusicSlowly: function () {
        var volume = AudioEngineWrapper.getMusicVolume();
        if (volume < 0.0001 || volume >= 0.99) {
            return;
        }
        if (this.actionType == ACTION_TYPE.ACTION_NULL) {
            this.beginSchedule();
        }
        AudioEngineWrapper.setMusicVolume(0.01);
        this.resumeMusic();
        this.actionType = ACTION_TYPE.ACTION_RESUME;
    },

    stopMusic: function () {
        AudioEngineWrapper.stopMusic();
    },

    stopEffect: function (effectName) {
        var fileName = game.utils.sprintf(this.suffix, effectName);
        var effectKey = this.effectMap[fileName];
        if (effectKey) {
            AudioEngineWrapper.stopEffect(effectKey);
            delete this.effectMap[fileName];
        }
    },

    stopAllEffects: function () {
        AudioEngineWrapper.stopAllEffects();
    },

    isEffectOn: function () {
        var isOn = game.storageController.getItem("effect_on", "true");
        if (isOn == "true") {
            return true;
        }
        return false;
    },

    isMusicOn: function () {
        var isOn = game.storageController.getItem("music_on", "true");
        if (isOn == "true") {
            return true;
        }
        return false;
    },

    isVibrateOn: function () {
        var isOn = game.storageController.getItem("vibrate_on", "true");
        if (isOn == "true") {
            return true;
        }
        return false;
    },

    pauseMusic: function () {
        AudioEngineWrapper.pauseMusic();
    },

    pauseMusicSlowly: function () {
        if (!this.isPlayingMusic()) {
            return;
        }
        if (AudioEngineWrapper.getMusicVolume() < 0.0001) {
            return;
        }
        if (this.actionType == ACTION_TYPE.ACTION_NULL) {
            this.beginSchedule();
        }
        //AudioEngineWrapper.setMusicVolume(0.99);
        this.actionType = ACTION_TYPE.ACTION_PAUSE;
    },

    playMusicSlowlyByKey: function (musicName, loop) {
        if (!this.isPlayingMusic()) {
            this.playMusicByKey(musicName, loop);
            return;
        }

        this.playType = PLAY_TYPE.PLAY_TYPE_FADE_OUT_FADE_IN;
        this.musicName = musicName;
        this.loop = loop;

        if (this.actionType == ACTION_TYPE.ACTION_NULL) {
            this.beginSchedule();
        }
        this.actionType = ACTION_TYPE.ACTION_PAUSE;
    },
    
    setEffectOn: function (isOn) {
        game.storageController.setItem("effect_on", "" + isOn);
    },

    setVibrateOn: function (isOn) {
        game.storageController.setItem("vibrate_on", "" + isOn);
    },

    setMusicOn: function (isOn) {
        if (isOn) {
            if (this.lastMusicVolume != 0) {
                AudioEngineWrapper.setMusicVolume(this.lastMusicVolume);
            } else {
                AudioEngineWrapper.setMusicVolume(1);
            }
        } else {
            this.lastMusicVolume = AudioEngineWrapper.getMusicVolume();
            AudioEngineWrapper.setMusicVolume(0);
        }
        game.storageController.setItem("music_on", "" + isOn);
    },

    setMusicVolume: function (volume) {
        if (this.isMusicOn()) {
            AudioEngineWrapper.setMusicVolume(volume);
        }
    },

    preloadEffect: function (effectName) {
        var fileName = game.utils.sprintf(this.suffix, effectName);
        cc.log("preload effect:" + fileName);
        AudioEngineWrapper.preloadEffect(fileName);
    },

    unloadEffect: function (effectName) {
        var fileName = game.utils.sprintf(this.suffix, effectName);
        cc.log("unload effect:" + fileName);
        AudioEngineWrapper.unloadEffect(fileName);
    },

    vibrateShort: function () {
        if (!this.isVibrateOn()) {
            return;
        }
        if (cc.sys.isNative) {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                return;
            }
            jsb_dp.oneSdkBridge.vibrateShort();
        }
    },

    vibrateLong: function () {
        if (!this.isVibrateOn()) {
            return;
        }
        if (cc.sys.isNative) {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                return;
            }
            jsb_dp.oneSdkBridge.vibrateLong();
        }
    }
});

AudioPlayer._instance = null;
AudioPlayer._firstUseInstance = true;

/**
 *
 * @returns {AudioPlayer}
 */
AudioPlayer.getInstance = function () {
    if (AudioPlayer._firstUseInstance) {
        AudioPlayer._firstUseInstance = false;
        AudioPlayer._instance = new AudioPlayer();
    }
    return AudioPlayer._instance;
};

module.exports = AudioPlayer;
},{}],3:[function(require,module,exports){
var GameBridge = {
    getMenuScene: function () {
        var MenuScene = require("../../many_bricks/scene/MenuScene");
        return new MenuScene();
    },

    getConfig: function () {
        return require("../../many_bricks/config/Config");
    },

    getPopupMan: function () {
        return require("../../many_bricks/model/PopupMan");
    },

    getLoadingScene: function () {
        var LoadingScene = require("../../many_bricks/scene/LoadingScene");
        return new LoadingScene();
    },

    getGameMan: function () {
        var GameMan = require("../../many_bricks/model/GameMan");
        return GameMan.getInstance();
    },

    getAdsHelper: function () {
        var AdsHelper = require("../../many_bricks/model/AdsHelper");
        return AdsHelper.getInstance();
    }
};

module.exports = GameBridge;
},{"../../many_bricks/config/Config":40,"../../many_bricks/model/AdsHelper":123,"../../many_bricks/model/GameMan":124,"../../many_bricks/model/PopupMan":126,"../../many_bricks/scene/LoadingScene":132,"../../many_bricks/scene/MenuScene":133}],4:[function(require,module,exports){
/**
 * Created by qinning on 15/4/23.
 */
var Utils = require("../util/Utils");

var BaseCCBController = function() {
};

BaseCCBController.prototype.onDidLoadFromCCB = function() {
    var self = this;
    var oldOnEnter = this.rootNode["onEnter"];
    this.rootNode["onEnter"] = function() {
        if(cc.isFunction(oldOnEnter)){
            oldOnEnter.apply(self.rootNode, arguments);
        }
        self.onEnter();
    };
    var oldOnExit = this.rootNode["onExit"];
    this.rootNode["onExit"] = function() {
        if (cc.isFunction(oldOnExit)) {
            oldOnExit.apply(self.rootNode, arguments);
        }
        self.onExit();
    };
    this._visitNodes();
};

BaseCCBController.prototype.onEnter = function() {
};

BaseCCBController.prototype.onExit = function() {
};

function setScaleWithParentSize(label) {
    cc.log("setScaleWithParentSize");
    var parent = label.getParent();
    var parentSize = parent.getContentSize();
    var fontSize = label.getContentSize();

    if (!label.__origin_scale) {
        label.__origin_scale = {
            x: label.getScaleX(),
            y: label.getScaleY()
        };
    }

    var size = {
        width : fontSize.width * label.__origin_scale.x,
        height : fontSize.height * label.__origin_scale.y
    };

    // a clean hacking, save us to calc the label height manually. :]
    // parentSize.height *= label.__origin_scale.y;

    if (size.width > parentSize.width || size.height > parentSize.height) {
        var x = Math.min(parentSize.width / size.width, 1) * label.__origin_scale.x;
        var y = Math.min(parentSize.height / size.height, 1) * label.__origin_scale.y;

        var scale = Math.min(x, y);
        label.setScale(scale);
    } else {
        //maybe reused, reset origin size
        label.setScale(label.__origin_scale.x);
    }
}

BaseCCBController.prototype._visitNodes = function () {
    var TouchedNode = require("../ext/TouchedNode");
    Utils.walkNode(this.rootNode, function(nd) {
        if (nd.___visited) {
            return true;
        }
        nd.___visited = true;
        if (!game.config.menuNoScale) {
            var isMenuItem = Utils.isNodeMenuItem(nd);
            if (isMenuItem || (Utils.isNodeButton(nd) && nd.zoomOnTouchDown)) {
                if (nd.zoomOnTouchDown) {
                    nd.zoomOnTouchDown = false;
                }
                var node = new TouchedNode(isMenuItem);
                nd.addChild(node);
            }
        }

        if (nd.getString != null && nd.setString != null) {
            var parent = nd.getParent();
            //cc.log("_visitNodes tag:" + parent.getTag());
            if (parent && parent.getTag() === 79) {
                var isBMFont = false;
                if(Utils.isLabelBMFont(nd)) {
                    isBMFont = true;
                }
                //cc.log("_visitNodes nd._className:" + nd._className);
                //cc.log("_visitNodes isBMFont:" + isBMFont);
                if(isBMFont) {
                    if (cc.sys.isNative) {
                        //cc.log("_visitNodes 2");
                        // maybe repeat call in onEnter
                        if (!nd.__origin_setstring) {
                            nd.__origin_setstring = nd.setString;
                            nd.setString = function(newString) {
                                this.__origin_setstring(newString);
                                // here we start to hack
                                setScaleWithParentSize(this);
                            }.bind(nd);
                        }
                    } else {
                        nd.setString = function(newString, needUpdateLabel) {
                            // origin code copied from CCLabelBMFont.js setString

                            newString = String(newString);
                            if (needUpdateLabel == null)
                                needUpdateLabel = true;
                            if (newString == null || !cc.isString(newString))
                                newString = newString + "";

                            //this._initialString = newString;
                            this._setString(newString, needUpdateLabel);

                            // here we start to hack
                            // set the dimension according to it's parent who has a tag 79
                            // needUpdateLabel == true, it prevents the loop been called recursively.
                            if (needUpdateLabel == true) {
                                setScaleWithParentSize(this);
                            }

                        }.bind(nd);
                    }
                }
            }

            var str = nd.getString();
            var searchStr = "&key.";
            if (str.substr(0, searchStr.length) == searchStr) {
                var key = str.substr(searchStr.length);
                var value = _(key);
                nd.setString(value);
            }
        }

        return true;
    });
};

module.exports = BaseCCBController;
},{"../ext/TouchedNode":14,"../util/Utils":35}],5:[function(require,module,exports){
/**
 * Created by qinning on 2017/8/29.
 */


var CrossPromController = function () {
    BaseCCBController.call(this);
    this._crossPromPic = null;

    this._corssPromConfig = null;
};

game.utils.inherits(CrossPromController, BaseCCBController);

CrossPromController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    if (this._infoLabel) {
        if (game.local.isChinese()) {
            this._infoLabel.setString("马上玩");
        } else {
            this._infoLabel.setString("Play");
        }
    }
};

CrossPromController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

CrossPromController.prototype.downloadClicked = function (sender) {
    AudioHelper.playBtnSound();
    cc.sys.openURL(this._corssPromConfig.downloadUrl);
    this.close();
};

CrossPromController.prototype.initWith = function (config, texture) {
    this._corssPromConfig = config;
    this._crossPromPic.setTexture(texture);
};

CrossPromController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

CrossPromController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

CrossPromController.createFromCCB = function(ccbName) {
    var node = game.utils.loadNodeFromCCB(ccbName, null, "CrossPromController", new CrossPromController());
    return node;
};

module.exports = CrossPromController;
},{}],6:[function(require,module,exports){

var NumberAnimation = cc.Class.extend({
    animing: false,
    startNum: 0,
    endNum: 0,
    step: 0,
    time: 0.8,
    label: null,

    ctor: function (label) {
        this.label = label;
    },

    playNumAnim: function (startNum, endNum) {
        this.animing = true;
        this.startNum = startNum;
        this.endNum = endNum;
        this.elapsedTime = 0;
        this.step = (this.endNum - this.startNum) / this.time;
    },

    update: function (dt) {
        if (this.animing) {
            this.elapsedTime += dt;
            cc.log("number:" + (this.startNum + this.step * this.elapsedTime));
            this.label.setString(Math.floor(this.startNum + this.step * this.elapsedTime));
            if (this.elapsedTime >= this.time) {
                this.label.setString(this.endNum);
                this.animing = false;
            }
        }
    },

    destroy: function () {
        this.label = null;
    }

});

module.exports = NumberAnimation;
},{}],7:[function(require,module,exports){
/**
 * Created by qinning on 2017/1/23.
 */

var PaymentInfo = function() {
    this.purchaseId = null;
    this.productId = null;
    this.receipt = null;
    this.signature = null;

    this.info = "";
};

PaymentInfo.prototype.unmarshal = function(jsonObj) {
    this.purchaseId = jsonObj["purchaseId"] || "";
    this.productId = jsonObj["productId"] || "";
    this.receipt = jsonObj["receipt"] || "";
    this.signature = jsonObj["signature"] || "";
    this.info = jsonObj["info"] || "";
};

module.exports = PaymentInfo;
},{}],8:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var PlayerInfo = function(){
    this.playerId = "";
    this.bestScore = 0;
    this.removedAds = false;
    this.level = 0;
    this.progress = 0;
    this.levelMap = null;
    this.rated = false;
};

PlayerInfo.prototype.unmarshall = function (json) {
    this.playerId = json["playerId"];
    this.bestScore = json["bestScore"] || 0;
    this.removedAds = json["removedAds"] || false;
    this.level = json["level"] || 1;
    this.progress = json["progress"] || 0;
    this.levelMap = json["levelMap"] || {};
    this.rated = json["rated"] || false;
};

PlayerInfo.createDefault = function () {
    var playerInfo = new PlayerInfo();
    playerInfo.hintsCount = 5;
    playerInfo.bestScore = 0;
    playerInfo.removedAds = false;
    playerInfo.level = 1;
    playerInfo.progress = 0;
    playerInfo.levelMap = {};
    playerInfo.rated = false;
    return playerInfo;
};

module.exports = PlayerInfo;

},{}],9:[function(require,module,exports){
/**
 * Created by qinning on 2017/1/23.
 */

var ProductInfo = function () {
    this.productId = 0;
    this.price = 0;
    this.description = null;
    this.title = null;
};

ProductInfo.prototype.unmarshal = function (jsonObj) {
    this.productId = jsonObj["productId"];
    this.price = jsonObj["price"];
    this.description = jsonObj["description"];
    this.title = jsonObj["title"];
};

module.exports = ProductInfo;
},{}],10:[function(require,module,exports){
var AdsPlace = {
    Pass: 1,
    Home: 2,
    BackGround: 3,
    Refresh: 4,
    FirstEnter: 5,
    Num: 5
};

AdsPlace.getName = function (place) {
    switch (place) {
        case AdsPlace.Pass:
            return "pass";
        case AdsPlace.Home:
            return "home";
        case AdsPlace.BackGround:
            return "background";
        case AdsPlace.Refresh:
            return "refresh";
        case AdsPlace.FirstEnter:
            return "first_enter";
        default:
            return "unknown";
    }
};

module.exports = AdsPlace;
},{}],11:[function(require,module,exports){
/**
 * Created by qinning on 2017/1/23.
 */

var PaymentCode = {
    PAYMENT_CODE_SUCCESS: 0,
    PAYMENT_CODE_FAIL: 1
};

module.exports = PaymentCode;
},{}],12:[function(require,module,exports){
/**
 * Created by alanmars on 15/4/17.
 */
var EventPackage = cc.Class.extend({
    callback: null,
    target: null,
    listener: null,

    ctor: function (callback, target, listener) {
        this.callback = callback;
        this.target = target;
        this.listener = listener;
    }
});

var EventUserData = cc.Class.extend({
    userData: null,

    ctor: function (userData, target, listener) {
        this.userData = userData;
    },

    getUserData: function() {
        return this.userData;
    }
});
var EventDispatcher = (function () {
    var instance;

    function createInstance() {
        var listenersMap = {};
        var listenersCustomMap = {};
        return {
            /**
             * @param {string} eventName
             * @param {function} callback
             * @param {object} target
             */
            addEventListener: function (eventName, callback, target) {

                var shouldAdd = true;
                var eventPackages = listenersMap[eventName];
                if (cc.isUndefined(eventPackages)) {
                    eventPackages = [];
                    listenersMap[eventName] = eventPackages;
                }
                else {
                    for (var i = 0; i < eventPackages.length; ++i) {
                        var eventPackage = eventPackages[i];
                        if (eventPackage.callback === callback && eventPackage.target === target) {
                            shouldAdd = false;
                            break;
                        }
                    }
                }

                if (shouldAdd) {
                    eventPackages.push(new EventPackage(callback, target, null));
                }
            },

            /**
             * @param {string} eventName
             * @param {function} callback
             * @param {object} target
             */
            removeEventListener: function (eventName, callback, target) {
                if (listenersMap[eventName]) {
                    /**
                     * @type {Array.<EventPackage>}
                     */
                    var eventPackages = listenersMap[eventName];
                    if (!cc.isUndefined(eventPackages) && eventPackages.length > 0) {
                        var newPackages = [];
                        for (var i = 0; i < eventPackages.length; ++i) {
                            /**
                             * @type {EventPackage}
                             */
                            var eventPackage = eventPackages[i];
                            if (eventPackage.callback === callback && eventPackage.target === target) {
                                //cc.eventManager.removeListener(eventPackage.listener);
                            }
                            else {
                                newPackages.push(eventPackage);
                            }
                        }
                        listenersMap[eventName] = newPackages;
                    }
                }
            },

            /**
             * @param {string} eventName
             * @param {object} userData
             */
            dispatchEvent: function (eventName, userData) {
                if (listenersMap[eventName]) {
                    var eventPackages = listenersMap[eventName];
                    if (!cc.isUndefined(eventPackages) && eventPackages.length > 0) {
                        var eventData = new EventUserData(userData);
                        for (var i = 0; i < eventPackages.length; ++i) {
                            var eventPackage = eventPackages[i];
                            if (eventPackage.callback != null) {
                                eventPackage.callback.call(eventPackage.target, eventData);
                            }
                        }
                    }
                }
            },

            /**
             * @param {string} eventName
             * @param {function} callback
             * @param {object} target
             */
            addCustomEventListener: function (eventName, callback, target) {
                var eventListener = cc.eventManager.addCustomListener(eventName, function (event) {
                    callback.call(target, event);
                });

                var shouldAdd = true;
                var eventPackages = listenersCustomMap[eventName];
                if (cc.isUndefined(eventPackages)) {
                    eventPackages = [];
                    listenersCustomMap[eventName] = eventPackages;
                }
                else {
                    for (var i = 0; i < eventPackages.length; ++i) {
                        var eventPackage = eventPackages[i];
                        if (eventPackage.callback === callback && eventPackage.target === target) {
                            shouldAdd = false;
                            break;
                        }
                    }
                }

                if (shouldAdd) {
                    eventPackages.push(new EventPackage(callback, target, eventListener));
                }
            },

            /**
             * @param {string} eventName
             * @param {function} callback
             * @param {object} target
             */
            removeCustomEventListener: function (eventName, callback, target) {
                if (listenersCustomMap[eventName]) {
                    /**
                     * @type {Array.<EventPackage>}
                     */
                    var eventPackages = listenersCustomMap[eventName];
                    if (!cc.isUndefined(eventPackages) && eventPackages.length > 0) {
                        var newPackages = [];
                        for (var i = 0; i < eventPackages.length; ++i) {
                            /**
                             * @type {EventPackage}
                             */
                            var eventPackage = eventPackages[i];
                            if (eventPackage.callback === callback && eventPackage.target === target) {
                                cc.eventManager.removeListener(eventPackage.listener);
                            }
                            else {
                                newPackages.push(eventPackage);
                            }
                        }
                        listenersCustomMap[eventName] = newPackages;
                    }
                }
            },

            /**
             * @param {string} eventName
             * @param {object} userData
             */
            dispatchCustomEvent: function (eventName, userData) {
                cc.eventManager.dispatchCustomEvent(eventName, userData);
            }
        };
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

module.exports = EventDispatcher;
},{}],13:[function(require,module,exports){
/**
 * Created by qinning on 15/7/2.
 */
cc.TABLEVIEW_FILL_LEFT_RIGHT = 0;
cc.TABLEVIEW_FILL_RIGHT_LEFT = 0;

/**
 * Sole purpose of this delegate is to single touch event in this version.
 */
cc.MultiColTableViewDelegate = cc.Class.extend(/** @lends cc.MultiColTableViewDelegate# */{
    gridTouched:function(table,grid){
    }
});

/**
 * Data source that governs table backend data.
 */
cc.MultiColTableViewDataSource = cc.Class.extend(/** @lends cc.TableViewDataSource# */{
    gridAtIndex:function(table,idx){
       return null;
    },
    numberOfCellsInTableView:function(table){
        return 0;
    },
    numberOfGridsInCell:function(table, idx){
        return 0;
    },
    gridSizeForTable:function(table, idx){
        return cc.size(0,0);
    }
});

cc.MultiColTableView = cc.LayerColor.extend({
    _multiTableViewDataSource: null,
    _multiTableViewDelegate: null,
    _horizontalOrder: cc.TABLEVIEW_FILL_LEFT_RIGHT,
    _gridsFreed: null,
    _curTouchLocation: null,

    _tableView: null,
    _touchNode: null,
    _gridCells: null,

    /**
     * @param dataSource
     * @param {cc.Size} size
     * @param container
     */
    ctor: function (dataSource, size, container) {
        this._super(cc.color(0, 0, 255, 0), size.width, size.height);
        this._gridsFreed = [];
        this._gridCells = {};
        this.setMultiTableViewDataSource(dataSource);
        this._tableView = new cc.TableView(this, size, container);
        this._tableView.setDelegate(this);
        this.addChild(this._tableView);
        this._touchNode = new cc.Node();
        this._tableView.addChild(this._touchNode,1);
    },

    onEnter: function () {
        this._super();
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan: this.onTouchBegan.bind(this)
        }, this._touchNode);
    },

    dequeueGrid: function () {
        if (this._gridsFreed.length == 0) {
            return null;
        } else {
            var grid = this._gridsFreed.shift();
            this._autoRelease(grid);
            return grid;
        }
    },

    _releaseCB: function () {
        this.release();
    },

    _autoRelease: function (obj) {
        var running = obj._running === undefined ? false : !obj._running;
        cc.director.getScheduler().schedule(this._releaseCB, obj, 0, 0, 0, running, obj.__instanceId);
    },

    tableCellSizeForIndex: function (table, idx) {
        var size = this.getMultiTableViewDataSource().gridSizeForTable(this, idx);
        if (table.getDirection() === cc.SCROLLVIEW_DIRECTION_HORIZONTAL) {
            size.height *= this.getMultiTableViewDataSource().numberOfGridsInCell(this, idx);
        } else {
            size.width *= this.getMultiTableViewDataSource().numberOfGridsInCell(this, idx);
        }
        return size;
    },

    tableCellAtIndex: function (table, idx) {
        var grid;
        var numberOfGridsInCell = this.getMultiTableViewDataSource().numberOfGridsInCell(this, idx);
        var cell = table.dequeueCell();
        if (!cell) {
            cell = new cc.TableViewCell();
        } else {
            var children = cell.getChildren();
            for (var i = children.length - 1; i >= 0; --i) {
                grid = children[i];
                this._gridsFreed.push(grid);
                grid.setIdx(cc.INVALID_INDEX);
                grid.retain();
                grid.removeFromParent(false);
            }
        }
        var startIndex = 0;
        for (var localIdx = 0; localIdx < idx; ++localIdx) {
            startIndex += this.getMultiTableViewDataSource().numberOfGridsInCell(this, localIdx);
        }
        var gridSize = this.getMultiTableViewDataSource().gridSizeForTable(this, idx);
        for (var gridIdx = startIndex, colIdx = 0; gridIdx < (numberOfGridsInCell + startIndex); gridIdx++, colIdx++) {
            grid = this.getMultiTableViewDataSource().gridAtIndex(this, gridIdx);
            if (grid) {
                grid.setIdx(gridIdx);
                this._gridCells[gridIdx] = grid;
                grid.setAnchorPoint(cc.p(0, 0));
                if (table.getDirection() === cc.SCROLLVIEW_DIRECTION_HORIZONTAL) {
                    if (table.getVerticalFillOrder() === cc.TABLEVIEW_FILL_TOPDOWN) {
                        grid.setPosition(cc.p(0, gridSize.height * (numberOfGridsInCell - colIdx - 1)));
                    } else {
                        grid.setPosition(cc.p(0, gridSize.height * colIdx));
                    }
                } else {
                    grid.setPosition(cc.p(gridSize.width * colIdx, 0));
                }
                cell.addChild(grid);
            }
        }
        return cell;
    },

    numberOfCellsInTableView: function (table) {
        var numberOfCells = this.getMultiTableViewDataSource().numberOfCellsInTableView(this);
        return numberOfCells;
    },

    tableCellTouched: function (table, cell) {
        if (!this.getMultiTableViewDelegate()) {
            return;
        }
        for (var i = 0; i < cell.getChildren().length; i++) {
            var grid = cell.getChildren()[i];
            grid.setContentSize(this.getMultiTableViewDataSource().gridSizeForTable(this, cell.getIdx()));
            if (grid != null && this.isTouchInside(grid, this._curTouchLocation)) {
                this.getMultiTableViewDelegate().gridTouched(this, grid);
                break;
            }
        }
    },

    scrollViewDidScroll: function (view) {
        if (this._multiTableViewDelegate && this._multiTableViewDelegate.scrollViewDidScroll) {
            this._multiTableViewDelegate.scrollViewDidScroll(this);
        }
    },

    tableCellWillRecycle: function (table, cell) {
    },

    tableCellHighlight:function(table, cell){
    },

    tableCellUnhighlight:function(table, cell){
    },

    onTouchBegan: function (touch, event) {
        this._curTouchLocation = touch.getLocation();
        return false;
    },

    getMultiTableViewDataSource: function () {
        return this._multiTableViewDataSource;
    },
    setMultiTableViewDataSource: function (dataSource) {
        this._multiTableViewDataSource = dataSource;
    },

    getMultiTableViewDelegate: function () {
        return this._multiTableViewDelegate;
    },

    setMultiTableViewDelegate: function (delegate) {
        this._multiTableViewDelegate = delegate;
    },

    setHorizontalOrder: function (order) {
        this._horizontalOrder = order;
    },
    getHorizontalOrder: function () {
        return this._horizontalOrder;
    },

    isTouchInside: function (owner, touchLocation) {
        if (!owner || !owner.getParent()) {
            return false;
        }
        touchLocation = owner.getParent().convertToNodeSpace(touchLocation);
        return cc.rectContainsPoint(owner.getBoundingBox(), touchLocation);
    },

    reloadData: function () {
        this._tableView.reloadData();
    },

    setContentOffset: function (offset, animated) {
        return this._tableView.setContentOffset(offset, animated);
    },

    getContentOffset:function () {
        return this._tableView.getContentOffset();
    },

    minContainerOffset:function () {
        return this._tableView.minContainerOffset();
    },

    maxContainerOffset:function () {
        return this._tableView.maxContainerOffset();
    },

    setDirection:function (direction) {
        this._tableView.setDirection(direction);
    },

    /**
     * determines how cell is ordered and filled in the view.
     */
    setVerticalFillOrder: function (fillOrder) {
        this._tableView.setVerticalFillOrder(fillOrder);
    },

    setContentOffsetInDuration: function (offset, dt) {
        this._tableView.setContentOffsetInDuration(offset, dt);
    },

    getViewSize: function () {
        return this._tableView.getViewSize();
    },

    getContentSize: function () {
        return this._tableView.getContentSize();
    },

    getGridAtIndex:function (idx) {
        return this._gridCells[idx];
    },

    setViewSize: function (viewSize) {
        this.setContentSize(viewSize);
        this._tableView.setViewSize(viewSize);
    },

    setBounceable: function (bounceable) {
        this._tableView.setBounceable(bounceable);
    },

    setTouchEnabled: function (touchable) {
        this._tableView.setTouchEnabled(touchable);
    },

    isDragging: function () {
        return this._tableView.isDragging();
    },

    getContainer: function () {
        return this._tableView.getContainer();
    }
});

module.exports = cc.MultiColTableView;
},{}],14:[function(require,module,exports){
/**
 * Created by zhangmingxu on 29/11/2016.
 */

var TouchedNode = cc.Node.extend({
    offsetX: 10,
    offsetY: 5,

    ctor: function (isMenuItem) {
        this._isMenuItem = isMenuItem;
        this._isTouched = false;
        this._isHover = false;
        this._isHoverPlaying = false;

        this._buttonToucher = null;
        this._buttonMouser = null;
        this._super();
        this._name = "TouchedNode";
    },

    onEnter: function () {
        this._super();

        ///Touch Events
        this._buttonToucher = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan: this.onTouchBegan.bind(this),
            onTouchMoved: this.onTouchMoved.bind(this),
            onTouchEnded: this.onTouchEnded.bind(this)
        }, this);
        cc.eventManager.addListener(this._buttonToucher, this);

        ///Mouse Events
        if(! cc.sys.isNative) {
            this._buttonMouser = cc.EventListener.create({
                event: cc.EventListener.MOUSE,
                swallowTouches: true,
                onMouseMove: this.onMouseMove.bind(this)
            });
            cc.eventManager.addListener(this._buttonMouser, this);
        }
    },

    onExit: function() {
        if(this._buttonToucher) {
            cc.eventManager.removeListener(this._buttonToucher);
            this._buttonToucher = null;
        }
        if(! cc.sys.isNative) {
            if(this._buttonMouser) {
                cc.eventManager.removeListener(this._buttonMouser);
                this._buttonMouser = null;
            }
        }

        this._super();
    },

    onTouchBegan:function (touch, event) {
        var pos = touch.getLocation();
        var target = this.parent;
        if (target && cc.rectContainsPoint(target.getBoundingBoxToWorld(), pos)) {
            if(target.enabled && target.visible) {
                this._isTouched = true;
                this._isHover = false;
                this._playBegin(target);
                return true;
            }
        }
        return false;
    },

    onTouchMoved:function (touch, event) {

    },

    onTouchEnded:function (touch, event) {
        if(this._isTouched) {
            this._isTouched = false;
            var target = this.parent;
            if (target) {
                this._playEnd(target);
            }
        }
    },

    onMouseMove: function(event) {
        var pos = event.getLocation();
        ///NOTE: target's parent is Button
        var target = this.parent;
        if (target) {
            if(cc.rectContainsPoint(target.getBoundingBoxToWorld(), pos)) {
                if(!this._isHover && !this._isTouched) {
                    if(target.enabled && target.visible) {
                        this._isHover = true;
                        this._playHover(target, true);
                    }
                }
            } else {
                if(this._isHover) {
                    this._isHover = false;
                    this._playHover(target, false);
                }
            }
        }
    },

    _onHoverEnded: function() {
        this._isHoverPlaying = false;
    },

    _playBeginEx: function(target) {
        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();
        target.runAction(
            cc.sequence(
                cc.delayTime(0.01),
                cc.scaleTo(0.1, 1.1, 0.9),
                cc.delayTime(0.01)
            )
        );
    },

    _playEndEx: function(target) {
        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();
        target.runAction(
            cc.sequence(
                cc.delayTime(0.01),
                cc.scaleTo(0.1, 1, 1),
                cc.delayTime(0.01)
            )
        );
    },

    _playBegin: function(target) {
        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();
        target.runAction(
            cc.scaleTo(0.20, 0.85, 0.85)
        );
    },

    _playEnd: function(target) {
        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();
        target.runAction(
            cc.scaleTo(0.20 ,1, 1)
        );
    },

    _playHoverEx: function(target) {
        var bounding = target.getBoundingBox();
        if(bounding.width < this.offsetX) {
            bounding.width = this.offsetX;
        }
        if(bounding.height < this.offsetY) {
            bounding.height = this.offsetY;
        }

        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();
        target.runAction(
            cc.sequence(
                cc.scaleTo(0.08, (bounding.width-this.offsetX)/bounding.width, (bounding.height+this.offsetY)/bounding.height),
                cc.scaleTo(0.1, (bounding.width+this.offsetX)/bounding.width, (bounding.height-this.offsetY)/bounding.height),
                cc.delayTime(0.04),
                cc.scaleTo(0.1, 1, 1),
                cc.callFunc(this._onHoverEnded, this)
            )
        );
    },

    _playHover: function(target, isHover) {
        //cc.error("hover: target = ", target, Date.now());
        /**
         * NOTE: CCB has bug, CCControlButton can NOT set child, so use empty node contains button and label
         * CCNode[empty]
         *    |_CCControlButton
         *          |_TouchedNode
         */
        if(target.parent) {
            target = target.parent;
        }
        /**
         * NOTE: MenuItem is more specially
         * CCNode[empty]
         *    |_CCMenu
         *          |_CCMenuItemImage
         *                  |_TouchedNode
         */
        if(this._isMenuItem && target.parent) {
            target = target.parent;
        }
        target.stopAllActions();

        if(isHover) {
            target.runAction(
                cc.sequence(
                    cc.scaleTo(0.16, 1.08, 1.08),
                    cc.scaleTo(0.1, 1.06, 1.06)
                )
            );
        } else {
            target.setScale(1, 1);
        }

    }

});

module.exports = TouchedNode;
},{}],15:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var HttpClient = require("../../common/net/HttpClient");
var AdsPlace = require("../enum/AdsPlace");

var AD_CONFIG_URL = "https://qinning199.github.io/game.html";

//var ONE_MINUTE = 60 * 1000;
var AdListener = cc.Class.extend({
    onRewardedVideoFinished: function (isRewarded) {
    },

    onInterstitialAdEnd: function (channelName) {
    },

    onShowVideoAdBegin: function () {
    },

    onShowVideoAdEnd: function () {
    }
});

var AdPlaceInfo = function (interval) {
    this.interval = interval;
    this.lastShowTime = Date.now();
};


var AdsManager = cc.Class.extend({
    DEFAULT_AD_INTERVAL: 40 * 1000,

    intervalMap: {
        "0": 80,
        "1": 80,
        "2": 60,
        "3": 40
    },

    ONE_MINUTE_SECOND: 60 * 1000,

    adConfigUrl: "",

    rateTime: 0,
    ratedTime: 0,
    rateRemoveAds: false,

    isNewPlayer: true,

    adPlaceMap: {},

    /**
     * @type {AdListener}
     */
    adListener: null,

    showTopBanner: true,
    topBannerDay: 0,

    showFirstEnterAd: true,
    firstEnterShowAdDay: 2,

    lastInterstitialTime: 0,
    lastRewardedTime: 0,
    enabledInterstitialAd: true,

    popupLevelLimit: 4,
    skinMaxPopCount: 3,
    boxMaxPopCount: 3,
    cardMaxPopCount: 3,
    startLevelLimit: 2,
    popupResetLimit: 8,

    ctor: function () {
        if(cc.sys.isNative) {
            jsb_dp.oneSdkBridge.onInterstitialAdFinished = this.onAdFinishedJsb.bind(this);
            jsb_dp.oneSdkBridge.onVideoAdFinished = this.onVideoAdFinishedJsb.bind(this);
            jsb_dp.oneSdkBridge.onShowVideoAdBegin = this.onShowVideoAdBeginJsb.bind(this);
            jsb_dp.oneSdkBridge.onShowVideoAdEnd = this.onShowVideoAdEndJsb.bind(this);
        }
        for (var i = 1; i <= AdsPlace.Num; ++i) {
            this.adPlaceMap[i] = new AdPlaceInfo(this.DEFAULT_AD_INTERVAL);
        }
    },

    init: function () {
        this.initInterval();
        this.adPlaceMap[AdsPlace.FirstEnter].interval = 0;
        this.logInterval("local");
    },

    onRemoteConfigReceived: function () {
        this.initInterval();
    },

    getIntervalMap: function () {
        return this.intervalMap;
    },

    initInterval: function () {
        cc.log("AdsManager initInterval");
        var intervalMap = this.getIntervalMap();
        var day = game.playerMan.getRegisterDay();
        var interval = intervalMap[day];
        if (!interval) {
            var keys = Object.keys(intervalMap);
            var key = keys[keys.length - 1];
            cc.log("AdsManager init interval key:" + key);
            interval = intervalMap[key];
        }
        if (interval) {
            this.adPlaceMap[AdsPlace.Pass].interval = interval * 1000;
            cc.log("AdsManager pass interval:" + (interval * 1000) + ",day:" + day);
        }
    },

    loadRemoteData: function () {
        var adConfigUrl = game.config.getAdUrl() || AD_CONFIG_URL;
        cc.log("AdsManager loadRemoteData:" + adConfigUrl);
        var self = this;
        HttpClient.doGet(adConfigUrl, function (error, text) {
            cc.log("AdsManager remote response:" + error + ",text:" + text);
            if (!error) {
                try {
                    var adConfig = JSON.parse(text);

                    if (cc.sys.os === cc.sys.OS_ANDROID) {
                        if (adConfig && adConfig.androidConfig) {
                            adConfig = adConfig.androidConfig;
                        }
                    }

                    var estimatedRatio = adConfig.estimatedRatio;
                    if (!isNaN(estimatedRatio)) {
                        game.config.estimatedRatio = estimatedRatio;
                    }

                    var minPossibility = adConfig.minPossibility;
                    if (!isNaN(minPossibility)) {
                        game.config.minPossibility = minPossibility;
                    }

                    var intervalMap = adConfig.newIntervalMap;
                    cc.log("AdsManager intervalMap:" + JSON.stringify(intervalMap));
                    if (!cc.isUndefined(intervalMap)) {
                        self.intervalMap = intervalMap;
                        self.initInterval();
                    }

                    var showTopBanner = adConfig.showTopBanner;
                    if (!cc.isUndefined(showTopBanner)) {
                        self.showTopBanner = showTopBanner;
                    }

                    var showTopBannerNew = adConfig.showTopBannerNew;
                    if (!cc.isUndefined(showTopBannerNew)) {
                        self.showTopBanner = showTopBannerNew;
                    }

                    var topBannerDay = adConfig.topBannerDay;
                    if (!cc.isUndefined(topBannerDay)) {
                        self.topBannerDay = topBannerDay;
                    }

                    var showFirstEnterAd = adConfig.showFirstEnterAd;
                    if (!cc.isUndefined(showFirstEnterAd)) {
                        self.showFirstEnterAd = showFirstEnterAd;
                    }

                    var firstEnterShowAdDay = adConfig.firstEnterShowAdDay;
                    if (!cc.isUndefined(firstEnterShowAdDay)) {
                        self.firstEnterShowAdDay = firstEnterShowAdDay;
                    }

                    var backToGroundInterval = adConfig.backToGroundInterval;
                    if (!cc.isUndefined(backToGroundInterval)) {
                        self.adPlaceMap[AdsPlace.BackGround].interval = backToGroundInterval * 1000;
                    }

                    var backToHomeInterval = adConfig.backToHomeInterval;
                    if (!cc.isUndefined(backToHomeInterval)) {
                        self.adPlaceMap[AdsPlace.Home].interval = backToHomeInterval * 1000;
                    }

                    var refreshInterval = adConfig.refreshInterval;
                    if (!cc.isUndefined(refreshInterval)) {
                        self.adPlaceMap[AdsPlace.Refresh].interval = refreshInterval * 1000;
                    }

                    var popupLevelLimit = adConfig.popupLevelLimit;
                    if (!cc.isUndefined(popupLevelLimit)) {
                        self.popupLevelLimit = popupLevelLimit;
                    }

                    var skinMaxPopCount = adConfig.skinMaxPopCount;
                    if (!cc.isUndefined(skinMaxPopCount)) {
                        self.skinMaxPopCount = skinMaxPopCount;
                    }

                    var boxMaxPopCount = adConfig.boxMaxPopCount;
                    if (!cc.isUndefined(boxMaxPopCount)) {
                        self.boxMaxPopCount = boxMaxPopCount;
                    }

                    var startLevelLimit = adConfig.startLevelLimit;
                    if (!cc.isUndefined(startLevelLimit)) {
                        self.startLevelLimit = startLevelLimit;
                    }

                    var cardMaxPopCount = adConfig.cardMaxPopCount;
                    if (!cc.isUndefined(cardMaxPopCount)) {
                        self.cardMaxPopCount = cardMaxPopCount;
                    }

                    var popupResetLimit = adConfig.popupResetLimit;
                    if (!cc.isUndefined(popupResetLimit)) {
                        self.popupResetLimit = popupResetLimit;
                    }

                    if (game.utils.isSelfGame()) {
                        var adsConfig = adConfig.adsConfig;
                        if (adsConfig) {
                            if (jsb_dp.oneSdkBridge.setInterstitialAdWeightConfig) {
                                jsb_dp.oneSdkBridge.setInterstitialAdWeightConfig(JSON.stringify(adsConfig));
                            }
                        }

                        var rewardAdsConfig = adConfig.rewardAdsConfig;
                        if (rewardAdsConfig) {
                            if (jsb_dp.oneSdkBridge.setRewardAdWeightConfig) {
                                jsb_dp.oneSdkBridge.setRewardAdWeightConfig(JSON.stringify(rewardAdsConfig));
                            }
                        }
                    }

                    var bannerAdsConfig = adConfig.bannerAdsConfig;
                    if (bannerAdsConfig) {
                        if (jsb_dp.oneSdkBridge.setBannerAdWeightConfig) {
                            jsb_dp.oneSdkBridge.setBannerAdWeightConfig(JSON.stringify(bannerAdsConfig));
                        }
                    }

                    var nativeAdsConfig = adConfig.nativeAdsConfig;
                    if (nativeAdsConfig) {
                        if (jsb_dp.oneSdkBridge.setNativeAdWeightConfig) {
                            jsb_dp.oneSdkBridge.setNativeAdWeightConfig(JSON.stringify(nativeAdsConfig));
                        }
                    }

                    self.logInterval("server");
                } catch (e) {
                    cc.log("AdsManager error:" + e.message);
                }
            }
        });
    },

    getRegisterDay: function () {
        return game.playerMan.getRegisterDay();
    },

    logInterval: function (tag) {
        cc.log("AdsManager " + tag + " adPlaceMap:" + JSON.stringify(this.adPlaceMap) +
            ",day:" + this.getRegisterDay() + ",showTopBanner:" + this.showTopBanner + ",topBannerDay:" + this.topBannerDay);
    },

    setIsNewPlayer: function (isNew) {
        this.isNewPlayer = isNew;
    },

    onGameOnShow: function () {
    },

    setAdListener: function (adListener) {
        this.adListener = adListener;
    },

    isRemovedAds: function () {
        return game.playerMan.player.removedAds;
    },

    showBannerAds: function (placement) {
        cc.log("AdsManager showBannerAds:" + placement);
        if (this.isRemovedAds()) return;
        if (cc.sys.isNative) {
            if (!this.isShowBannerAds(placement)) {
                jsb_dp.oneSdkBridge.showBannerAd(placement);
            }
        }
    },

    removeBannerAds: function (placement) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.removeBannerAd(placement);
        }
    },

    isShowBannerAds: function (placement) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isShowBannerAd(placement);
        }
        return false;
    },

    isShowNativeAd: function (placement) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isShowNativeAd(placement);
        }
        return false;
    },

    showInterstitial: function (place) {
        if (!this.enabledInterstitialAd) {
            return;
        }
        if (this.isRemovedAds()) return;

        var placement = "default";
        if (place === AdsPlace.Home) {
            placement = "home";
        } else if (place === AdsPlace.Refresh) {
            placement = "refresh";
        }

        if (cc.sys.isNative) {
            if (!jsb_dp.oneSdkBridge.isInterstitialAdReady(place)) {
                game.analyseManager.trackEvent("WatchISNotReady", {name: AdsPlace.getName(this.place)});
                cc.log("AdsManager showInterstitial ads not ready");
                return;
            }
        }
        cc.log("AdsManager showInterstitial place:" + place + ", interval:" + this.adPlaceMap[place].interval + ",current interval:" +
            (Date.now() - this.adPlaceMap[place].lastShowTime));
        if (Date.now() - this.adPlaceMap[place].lastShowTime < this.adPlaceMap[place].interval) {
            return;
        }

        if (Date.now() - this.lastInterstitialTime < 5 * 1000) {
            cc.log("AdsManager showInterstitial interval less than 5 seconds");
            return;
        }
        if (Date.now() - this.lastRewardedTime < 5 * 1000) {
            cc.log("AdsManager showInterstitial rewarded video disable interstitial 5 seconds");
            return;
        }

        this.adPlaceMap[place].lastShowTime = Date.now();

        cc.log("AdsManager showInterstitial place:" + place + " showed");
        this.lastInterstitialTime = Date.now();

        this.place = place;
        game.analyseManager.trackEvent("WatchISSourceStart", {name: AdsPlace.getName(this.place)});
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.showInterstitalAd(placement);
        }
    },

    showNativeAd: function (place, posX, posY) {
        cc.log("showNativeAd:" + place);
        if (this.isRemovedAds()) {
            return;
        }
        if (cc.sys.isNative) {
            if (!this.isShowNativeAd(place)) {
                jsb_dp.oneSdkBridge.showNativeAd(place, posX, posY);
            }
        }
    },

    removeNativeAd: function (place) {
        if (this.isRemovedAds()) return;
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.removeNativeAd(place);
        }
    },

    setInterstitialShowed: function (place) {
        this.adPlaceMap[place].lastShowTime = Date.now();
    },

    showCrossPromotion: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.showCrossPromoteAd();
        }
    },

    isRewardVideoReady: function () {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isRewardVideoReady();
        }
        return false;
    },

    showRewardVideoAd: function (name) {
        if (!this.isRewardVideoReady()) {
            return;
        }
        this.enabledInterstitial(false);
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.showRewardVideoAd(name);
        }
    },

    enabledInterstitial: function (enabled) {
        this.enabledInterstitialAd = enabled;
    },

    onAdFinishedJsb: function (str) {
        cc.log("onAdFinishedJsb:" + str);
        var adsFinishedObj = JSON.parse(str);
        var channelName = adsFinishedObj["channelName"];
        cc.log("channel :" + channelName + " show interstitial ads finished");

        if (this.adListener && this.adListener.onInterstitialAdEnd) {
            this.adListener.onInterstitialAdEnd(channelName);
        }
        game.analyseManager.trackEvent("WatchISSourceEnd", {name: AdsPlace.getName(this.place)});
        game.playerMan.addInterstitialAdCount();
    },

    onVideoAdFinishedJsb: function (str) {
        cc.log("onVideoAdFinishedJsb:" + str);
        var adsFinishedObj = JSON.parse(str);
        var isSkipped = adsFinishedObj.isSkipped;
        if (!isSkipped) {
            cc.log("reward video ads show success");
        } else {
            cc.log("reward video ads skipped");
        }

        if (this.adListener && this.adListener.onRewardedVideoFinished) {
            this.adListener.onRewardedVideoFinished(!isSkipped);
        }
        if (!isSkipped) {
            game.playerMan.addRewardedAdCount();
        }
    },

    onShowVideoAdBeginJsb: function () {
        if (this.adListener && this.adListener.onShowVideoAdBegin) {
            this.adListener.onShowVideoAdBegin();
        }
    },

    onShowVideoAdEndJsb: function () {
        if (this.adListener && this.adListener.onShowVideoAdEnd) {
            this.adListener.onShowVideoAdEnd();
        }
        this.enabledInterstitial(true);
        this.lastRewardedTime = Date.now();
    }
});

AdsManager.sharedDirector = null;
AdsManager.firstUseDirector = true;

AdsManager.getInstance = function () {
    if (AdsManager.firstUseDirector) {
        AdsManager.firstUseDirector = false;
        AdsManager.sharedDirector = new AdsManager();
    }
    return AdsManager.sharedDirector;
};

module.exports = AdsManager;
},{"../../common/net/HttpClient":29,"../enum/AdsPlace":10}],16:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */

var AnalyseManager = cc.Class.extend({
    g_pAnalytics: null,
    ctor: function () {
    },

    initAnalytics: function () {
    },

    trackLoginEvent: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackLogin();
        }
    },

    /**
     * @param {number} amountNum
     * @param {string} itemType
     * @param {string} itemId
     * @param {string} receipt
     */
    trackPurchaseEvent: function (amountNum, itemType, itemId, receipt) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackPurchase(amountNum, itemType, itemId, receipt);
        }
    },

    trackStartProgressionEvent: function (name, value) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackStartProgression(name, value);
        }
    },

    trackCompletedProgressionEvent: function (name, value) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackCompletedProgression(name, value);
        }
    },

    trackFailedProgressionEvent: function (name, value) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackFailProgression(name, value);
        }
    },

    /**
     * track error event
     * @param {string} errorMsg
     */
    trackErrorEvent: function (errorMsg) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackError(errorMsg);
        }
    },

    trackEvent: function (name, obj) {
        if (cc.sys.isNative) {
            var info = "";
            if (obj) {
                info = JSON.stringify(obj);
            }
            jsb_dp.oneSdkBridge.trackEvent(name, info);
        }
    },

    addVirtualCurrency: function (reason, value) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.addVirtualCurrency(reason, value);
        }
    },

    consumeVirtualCurrency: function (itemName, itemCount, virutalCurrency) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.consumeVirtualCurrency(itemName, itemCount, virutalCurrency);
        }
    },

    consumeItem: function (itemName, itemCount) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.consumeItem(itemName, itemCount);
        }
    },

    trackChargeRequest: function (orderId, iapId, currencyAmount, currencyType, virtualCurrencyAmount, paymentType) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackChargeRequest(orderId, iapId, currencyAmount, currencyType, virtualCurrencyAmount, paymentType);
        }
    },

    trackChargeSuccess: function (orderId) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.trackChargeSuccess(orderId);
        }
    },

    missionBegan: function (missionId) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.missionBegan(missionId);
        }
    },

    missionCompleted: function (missionId) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.missionCompleted(missionId);
        }
    },

    missionFailed: function (missionId, reason) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.missionFailed(missionId, reason);
        }
    },

    trackPlayerLevel: function (level) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.setPlayerLevel(level);
        }
    }
});

AnalyseManager.sharedDirector = null;
AnalyseManager.firstUseDirector = true;

AnalyseManager.getInstance = function () {
    if (AnalyseManager.firstUseDirector) {
        AnalyseManager.firstUseDirector = false;
        AnalyseManager.sharedDirector = new AnalyseManager();
    }
    return AnalyseManager.sharedDirector;
};

module.exports = AnalyseManager;
},{}],17:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var CaptureListener = cc.Class.extend({
    onCaptureAudio: function (audioDecible) {
    }
});


var CaptureManager = cc.Class.extend({

    ctor: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.onCaptureAudio = this.onCaptureAudio.bind(this);
        }
    },

    setCaptureListener: function (listener) {
        this.listener = listener;
    },

    captureAudio: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.captureAudio();
        }
    },

    getAudioDecible: function () {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.getAudioDecible();
        }
        return 0;
    },

    onCaptureAudio: function (audioDecibleString) {
        var audioObj = JSON.parse(audioDecibleString);
        var audioDecible = audioObj["audioDecible"];
        if (this.listener) {
            this.listener.onCaptureAudio(audioDecible);
        }
    }
});

CaptureManager.sharedDirector = null;
CaptureManager.firstUseDirector = true;

CaptureManager.getInstance = function () {
    if (CaptureManager.firstUseDirector) {
        CaptureManager.firstUseDirector = false;
        CaptureManager.sharedDirector = new CaptureManager();
    }
    return CaptureManager.sharedDirector;
};

module.exports = CaptureManager;
},{}],18:[function(require,module,exports){
/**
 * Created by qinning on 2017/8/29.
 */

var HttpClient = require("../../common/net/HttpClient");

var CrossPromData = function () {
    this.scoreLimit = 0;
    this.imageUrl = "";
    this.downloadUrl = "";
    this.weight = 0;
    this.appId = "";
};

var CrossPromManager = cc.Class.extend({
    cachedTexture: null,
    cachedConfig: null,
    crossProms: null,
    ctor: function () {
    },

    tryToLoadFromRemote: function () {
        var crossPromUrl = game.config.getCrossPromUrl();

        var self = this;
        HttpClient.doGet(crossPromUrl, function (error, text) {
            if (!error) {
                try {
                    cc.log("cross promotion tryToLoadFromRemote downloaded");
                    var data = JSON.parse(text);
                    var open = data.open || false;
                    if (!open) {
                        return;
                    }
                    var scoreLimit = data.scoreLimit || 0;
                    //if (!cc.isUndefined(game.playerMan.player.bestScore)) {
                    //    if (game.playerMan.player.bestScore < scoreLimit) {
                    //        cc.log("cross promotion tryToLoadFromRemote game.playerMan.player.bestScore:" + game.playerMan.player.bestScore);
                    //        return;
                    //    }
                    //}
                    if (!cc.isUndefined(game.playerMan.player.level)) {
                        if (game.playerMan.player.level < scoreLimit) {
                            return;
                        }
                    }
                    var maxPopCount = data.maxPopCount || 3;
                    self.downloadedShow = data.downloadedShow || false;
                    self.crossProms = data["crossProms"];
                    self.maxPopCount = maxPopCount;
                    self.tryToDownloadPromoImg();
                } catch (e) {
                }
            }
        });
    },

    tryToDownloadPromoImg: function () {
        if (this.maxPopCount <= 0) {
            return;
        }
        if (this.cachedConfig || this.cachedTexture) {
            return;
        }
        this.maxPopCount--;
        cc.log("cross promotion tryToDownloadPromoImg check");
        var self = this;
        if (!cc.isUndefined(this.crossProms) && cc.isArray(this.crossProms) && this.crossProms.length > 0) {
            var randomConfig = this.getRandomConfig(this.crossProms);
            this.removeCrossPromoCfg(randomConfig);
            //game.utils.download
            cc.log("cross promotion tryToDownloadPromoImg start download");
            game.utils.loadRemoteImg(randomConfig.imageUrl, function (error, tex, extra) {
                if (!error && tex) {
                    cc.log("cross promotion tryToDownloadPromoImg downloaded:" + self.downloadedShow);
                    self.cachedTexture = tex;
                    self.cachedTexture.retain();
                    self.cachedConfig = randomConfig;
                    if (self.downloadedShow) {
                        self.downloadedShow = false;
                        self.tryToPopupCrossPromDlg();
                    }
                }
            }, null);
        }
    },

    removeCrossPromoCfg: function (crossPromCfg) {
        for (var i = 0; i < this.crossProms.length; ++i) {
            if (this.crossProms[i] === crossPromCfg) {
                this.crossProms.splice(i, 1);
                break;
            }
        }
    },


    getRandomConfig: function (crossProms) {
        var totalWeight = 0;
        var i;
        for (i = 0; i < crossProms.length; ++i) {
            totalWeight += crossProms[i].weight;
        }

        var randomNum = game.utils.randomNextInt(totalWeight);

        var curWeight = 0;
        for (i = 0; i < crossProms.length; ++i) {
            curWeight += crossProms[i].weight;
            if (curWeight > randomNum) {
                return crossProms[i];
            }
        }

        return crossProms[0];
    },

    popupCrossPromDlg: function (crossPromsConfig, texture) {
        var CrossPromController = require("../controller/CrossPromController");
        var crossPromNode = CrossPromController.createFromCCB("res/cross/cross_prom_view.ccbi");
        crossPromNode.controller.initWith(crossPromsConfig, texture);
        crossPromNode.controller.popup();
    },

    tryToPopupCrossPromDlg: function () {
        cc.log("cross promotion tryToPopupCrossPromDlg start");
        if (this.cachedConfig && this.cachedTexture) {
            cc.log("cross promotion tryToPopupCrossPromDlg poped");
            this.popupCrossPromDlg(this.cachedConfig, this.cachedTexture);
            this.cachedTexture.release();
            this.cachedConfig = null;
            this.cachedTexture = null;
            this.tryToDownloadPromoImg();
        }
    }
});

CrossPromManager.sharedDirector = null;
CrossPromManager.firstUseDirector = true;

CrossPromManager.getInstance = function () {
    if (CrossPromManager.firstUseDirector) {
        CrossPromManager.firstUseDirector = false;
        CrossPromManager.sharedDirector = new CrossPromManager();
    }
    return CrossPromManager.sharedDirector;
};


module.exports = CrossPromManager;
},{"../../common/net/HttpClient":29,"../controller/CrossPromController":5}],19:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var GCManager = cc.Class.extend({

    ctor: function () {
    },

    isGameCenterAvailable: function () {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isGameCenterAvailable();
        }
        return false;
    },

    reportScore: function (score, leaderBoardKey) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.reportScore(score, leaderBoardKey);
        }
    },

    showLeaderboard: function (leaderBoardKey) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.showLeaderboard(leaderBoardKey);
        }
    },

    reportAchievement: function (percentCompleted, archievementKey) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.reportAchievement(percentCompleted, archievementKey);
        }
    },

    showAchievements: function (leaderBoardkey) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.showAchievements(leaderBoardkey);
        }
    },

    highScoreForLeaderboard: function (leaderBoardKey) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.highScoreForLeaderboard(leaderBoardKey);
        }
        return 0;
    },

    progressForAchievement: function (archievementKey) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.progressForAchievement(archievementKey);
        }
        return 0;
    }
});

GCManager.sharedDirector = null;
GCManager.firstUseDirector = true;

GCManager.getInstance = function () {
    if (GCManager.firstUseDirector) {
        GCManager.firstUseDirector = false;
        GCManager.sharedDirector = new GCManager();
    }
    return GCManager.sharedDirector;
};

module.exports = GCManager;
},{}],20:[function(require,module,exports){
/**
 * Created by qinning on 2017/3/11.
 */

var LocalizationManager = cc.Class.extend({

    _isLoaded: false,
    curLanguage: null,
    ctor: function () {
        if (cc.sys.language === cc.sys.LANGUAGE_ARABIC || cc.sys.language === cc.sys.LANGUAGE_RUSSIAN) {
            var searchPathArr = jsb.fileUtils.getSearchPaths();
            searchPathArr.unshift("res/ru");
            cc.log("search paths:" + JSON.stringify(searchPathArr));
            jsb.fileUtils.setSearchPaths(searchPathArr);
        }
    },

    reload: function () {
        if (this._isLoaded) {
            return;
        }
        if (game.utils.isSelfGame()) {
            this.curLanguage = game.utils.loadJson("res/config/languages/strings-zhs.json");
        } else {
            var fileName = "res/config/languages/strings-" + cc.sys.language + ".json";
            cc.log("local file:" + fileName);
            if (game.utils.isFileExist(fileName)) {
                this.curLanguage = game.utils.loadJson(fileName);
            } else {
                this.curLanguage = game.utils.loadJson("res/config/languages/strings-en.json");
            }
        }
        this._isLoaded = true;
    },

    getValue: function (key) {
        var value = this.curLanguage[key] || key;
        return value;
    },

    isChinese: function () {
        if (game.utils.isSelfGame()) {
            return true;
        }
        return false;
    }
});

LocalizationManager.sharedDirector = null;
LocalizationManager.firstUseDirector = true;

LocalizationManager.getInstance = function () {
    if (LocalizationManager.firstUseDirector) {
        LocalizationManager.firstUseDirector = false;
        LocalizationManager.sharedDirector = new LocalizationManager();
    }
    return LocalizationManager.sharedDirector;
};


module.exports = LocalizationManager;
},{}],21:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var NotificationManager = cc.Class.extend({

    ctor: function () {
    },

    registerNotification: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.registerNotification();
        }
    },

    /**
     *
     * @param timeFromNow
     * @param alertText
     * @param alertAction
     * @param badgeNumber
     * @param sound
     */
    scheduleNotification: function (timeFromNow, alertText, alertAction, badgeNumber) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.scheduleNotification(timeFromNow, alertText, alertAction, badgeNumber);
        }
    },

    unscheduleNotification: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.unscheduleNotification();
        }
    }
});

NotificationManager.sharedDirector = null;
NotificationManager.firstUseDirector = true;

NotificationManager.getInstance = function () {
    if (NotificationManager.firstUseDirector) {
        NotificationManager.firstUseDirector = false;
        NotificationManager.sharedDirector = new NotificationManager();
    }
    return NotificationManager.sharedDirector;
};


module.exports = NotificationManager;
},{}],22:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var RateManager = cc.Class.extend({

    ctor: function () {
    },

    init: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.initRateParams(3, 1, 0.5, 0.5, true);
        }
    },

    rate: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.launchRate();
        }
    },

    likeInFacebook: function (url) {
        cc.sys.openURL(url);
    },

    launchAppReview: function () {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.launchAppReview();
        }
        return false;
    }
});

RateManager.sharedDirector = null;
RateManager.firstUseDirector = true;

RateManager.getInstance = function () {
    if (RateManager.firstUseDirector) {
        RateManager.firstUseDirector = false;
        RateManager.sharedDirector = new RateManager();
    }
    return RateManager.sharedDirector;
};

module.exports = RateManager;
},{}],23:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var RemoteConfigManager = cc.Class.extend({

    remoteReceivedCB: null,
    ctor: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.onRemoteConfigReceived = this.onRemoteConfigReceived.bind(this);
        }
    },

    setRemoteConfigReceivedCallback: function (callback) {
        this.remoteReceivedCB = callback;
    },

    onRemoteConfigReceived: function () {
        if (this.remoteReceivedCB) {
            this.remoteReceivedCB();
        }
    },

    setDefaultRemoteConfig: function (params) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.setDefaultRemoteConfig(JSON.stringify(params));
        }
    },

    fetchRemoteConfig: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.fetchRemoteConfig();
        }
    },

    getRemoteConfig: function (key) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.getRemoteConfig(key);
        }
        return "";
    },

    activateRemoteFetched: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.activateRemoteFetched();
        }
    }

});

RemoteConfigManager.sharedDirector = null;
RemoteConfigManager.firstUseDirector = true;

RemoteConfigManager.getInstance = function () {
    if (RemoteConfigManager.firstUseDirector) {
        RemoteConfigManager.firstUseDirector = false;
        RemoteConfigManager.sharedDirector = new RemoteConfigManager();
    }
    return RemoteConfigManager.sharedDirector;
};

module.exports = RemoteConfigManager;
},{}],24:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */

var ShareManager = cc.Class.extend({
    ctor: function () {
    },

    shareWithSystem: function (tips) {
        if (cc.sys.isNative) {
            var fileName = "";
            //if (cc.sys.os === cc.sys.OS_IOS) {
            //    fileName = game.utils.getScreenShot("capture_screen.jpg");
            //}
            jsb_dp.oneSdkBridge.systemShare(fileName, tips);
        }
    },

    openAppWithIdentifier: function (appId) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.openAppWithIdentifier(appId);
        }
    },

    sendEmail: function (address, title, body) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.sendEmail(address, title, body);
        }
    }
});

ShareManager.sharedDirector = null;
ShareManager.firstUseDirector = true;

ShareManager.getInstance = function () {
    if (ShareManager.firstUseDirector) {
        ShareManager.firstUseDirector = false;
        ShareManager.sharedDirector = new ShareManager();
    }
    return ShareManager.sharedDirector;
};

module.exports = ShareManager;
},{}],25:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var PaymentInfo = require("../entity/PaymentInfo");
var PaymentCode = require("../enum/PaymentCode");
var ProductInfo = require("../entity/ProductInfo");

var PaymentDelegate = cc.Class.extend({
    /**
     * @param {PaymentCode} error
     * @param {PaymentInfo} paymentInfo
     */
    onPaymentCompleted: function (error, paymentInfo) {
    },

    /**
     * @param {Array.<PaymentInfo>} paymentInfoList
     */
    onGetUnverifiedReceiptList: function (paymentInfoList) {
    },

    /**
     * on get product list.
     * @param {Array.<ProductInfo>} productList
     */
    onGetProductList: function (productList) {
    }
});

var StoreManager = cc.Class.extend({
    /**
     * @type {PaymentDelegate}
     */
    paymentDelegate: null,

    /**
     * @param {Array.<PaymentInfo>} paymentInfoList
     */
    productList: null,

    ctor: function () {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.onGetProductList = this.onGetProductList.bind(this);
            jsb_dp.oneSdkBridge.onPurchase = this.onPurchase.bind(this);
            jsb_dp.oneSdkBridge.onConsume = this.onConsume.bind(this);
            jsb_dp.oneSdkBridge.onGetUnverifiedReceiptList = this.onGetUnverifiedReceiptList.bind(this);
        }
    },

    /**
     * set payment delegate.
     * @param {PaymentDelegate} paymentDelegate
     */
    setPaymentDelegate: function (paymentDelegate) {
        this.paymentDelegate = paymentDelegate;
    },

    onGetProductList: function (jsonResult) {
        cc.log("onGetProductList: " + jsonResult);
        if (jsonResult) {
            var products = JSON.parse(jsonResult);
            if (products && products.length > 0) {
                var productList = [];
                for (var i = 0; i < products.length; ++i) {
                    var productInfo = new ProductInfo();
                    productInfo.unmarshal(products[i]);
                    productList.push(productInfo);
                }
                this.paymentDelegate && this.paymentDelegate.onGetProductList(productList);
                this.productList = productList;
            }
        }
    },

    onPurchase: function (jsonResult) {
        cc.log("onPurchase: " + jsonResult);
        var purchaseResult = JSON.parse(jsonResult);
        var purchaseData;
        if (purchaseResult.errorCode === PaymentCode.PAYMENT_CODE_SUCCESS) {
            purchaseData = JSON.parse(jsonResult);
            this._paymentCompleted(PaymentCode.PAYMENT_CODE_SUCCESS, purchaseData);
        } else {
            purchaseData = JSON.parse(jsonResult);
            this._paymentCompleted(PaymentCode.PAYMENT_CODE_FAIL, purchaseData);
        }
    },

    onConsume: function (jsonInfo) {
        cc.log("onConsume: " + jsonInfo);
    },

    onGetUnverifiedReceiptList: function (purchaseListString) {
        cc.log("onGetUnverifiedReceiptList: " + purchaseListString);
        if (purchaseListString && purchaseListString.length > 0) {
            var purchaseJsonList = JSON.parse(purchaseListString);
            if (purchaseJsonList && purchaseJsonList.length > 0) {
                var purchaseInfoList = [];
                for (var i = 0; i < purchaseJsonList.length; ++i) {
                    var paymentMsg = purchaseJsonList[i];
                    var paymentInfo = new PaymentInfo();
                    paymentInfo.unmarshal(paymentMsg);
                    purchaseInfoList.push(paymentInfo);
                }
                this.paymentDelegate && this.paymentDelegate.onGetUnverifiedReceiptList(purchaseInfoList);
            }
        }

    },

    _paymentCompleted: function (error, paymentMsg) {
        var paymentInfo = new PaymentInfo();
        paymentInfo.unmarshal(paymentMsg);
        if (error === PaymentCode.PAYMENT_CODE_SUCCESS) {
            if (paymentMsg) {
                this.paymentDelegate && this.paymentDelegate.onPaymentCompleted(PaymentCode.PAYMENT_CODE_SUCCESS, paymentInfo);
            } else {
                this.paymentDelegate && this.paymentDelegate.onPaymentCompleted(PaymentCode.PAYMENT_CODE_FAIL, paymentInfo);
            }
        } else {
            this.paymentDelegate && this.paymentDelegate.onPaymentCompleted(PaymentCode.PAYMENT_CODE_FAIL, paymentInfo);
        }
        //if (cc.sys.os !== cc.sys.OS_ANDROID) {
        //    this.consume(paymentInfo.purchaseId);
        //}
    },

    _getNumFromString: function (text) {
        return text.replace(/[^0-9.]/ig, "");
    },

    requestProduct: function (productIds) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.getProductsInfo(productIds);
        }
    },

    payForProduct: function (productId) {
        cc.log("payForProduct:" + productId);
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.purchase(productId);
        }
    },

    consume: function (transactionId) {
        cc.log("consume:" + transactionId);
        if (cc.sys.isNative) {
            if (transactionId && transactionId.length > 0) {
                jsb_dp.oneSdkBridge.consume(transactionId);
            }
        }
    },

    restoreCompletedTransactions: function () {
        cc.log("restoreCompletedTransactions");
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.restoreTransactions();
        }
    },

    getUnverifiedReceiptList: function () {
        cc.log("getUnverifiedReceiptList");
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.getUnverifiedReceiptList();
        }
    },

    _getProductById: function (productId) {
        if (this.productList && this.productList.length > 0) {
            for (var i = 0; i < this.productList.length; ++i) {
                var product = this.productList[i];
                if (product.productId === productId) {
                    return product;
                }
            }
        }
        return null;
    }
});

StoreManager.sharedDirector = null;
StoreManager.firstUseDirector = true;

StoreManager.getInstance = function () {
    if (StoreManager.firstUseDirector) {
        StoreManager.firstUseDirector = false;
        StoreManager.sharedDirector = new StoreManager();
    }
    return StoreManager.sharedDirector;
};

module.exports = StoreManager;
},{"../entity/PaymentInfo":7,"../entity/ProductInfo":9,"../enum/PaymentCode":11}],26:[function(require,module,exports){
var EffectMan = cc.Class.extend({
    ctor: function () {
    },

    playFlyCoins: function (startWorld, endWorld, coinNum, speed, startCallback, endCallback) {
        var parentNode = cc.director.getRunningScene();
        var self = this;
        coinNum = 10;
        //cc.loader.loadRes("prefabs/coins_anim", function (err, prefab) {
        var i = 0;
        while (i < coinNum) {
            var func = function (node, isStart, isEnd) {
                return function () {
                    var cb = null;
                    if (isStart) {
                        cb = startCallback;
                    } else if (isEnd) {
                        cb = endCallback;
                    }
                    self.showFlyAnim(startWorld, endWorld, node, parentNode, speed, cb);
                }
            };
            var newNode = new cc.Sprite("#icon_diamond_effect.png");
            newNode.scale = 0.8;
            newNode.retain();
            var isStart = (i === 0);
            var isEnd = (i === coinNum - 1);
            // 500 => 100 500x = 100, 1000x = 50 500x = -50, x = -0.2
            // 1000 => 50
            setTimeout(func(newNode, isStart, isEnd), (200 - speed / 10) * i);
            i++;
        }
        //});
    },

    showFlyAnim: function (starWorld, endWorld, animNode, parentNode, speed, callback) {
        var start = starWorld;
        var end = endWorld;
        var length = Math.sqrt((start.x - end.x) * (start.x - end.x) + (start.y - end.y) * (start.y - end.y));
        var delay = length / speed;
        parentNode.addChild(animNode, 2000);
        animNode.release();
        animNode.setPosition(start);
        var controlPoints = [
            start,
            this.getPerpendicularPoint(start, end, 50, 0.5),
            end
        ];
        animNode.runAction(cc.sequence(cc.bezierTo(delay, controlPoints), cc.callFunc(function () {
            if (callback) {
                callback();
            }
        }, this), cc.removeSelf()));
    },

    getPerpendicularPoint: function(from, to, dis, factor) {
        var vec = {x: from.x - to.x, y: from.y - to.y};
        var perpendicularVec = {x: vec.y, y: -vec.x};
        var centerPoint = this.lerpPosition(from, to, factor);
        var perpendicularVecLen = Math.sqrt(perpendicularVec.x * perpendicularVec.x + perpendicularVec.y * perpendicularVec.y);
        var perpendicularVecNoraml = {
            x: perpendicularVec.x / perpendicularVecLen,
            y: perpendicularVec.y / perpendicularVecLen
        };
        return new cc.p(centerPoint.x + perpendicularVecNoraml.x * dis,
            centerPoint.y + Math.abs(perpendicularVecNoraml.y * dis));
    },

    lerpPosition: function(pos0,pos1,step){
        return {x:(pos1.x - pos0.x)*step + pos0.x, y:(pos1.y - pos0.y)*step + pos0.y};
    }
});

EffectMan._instance = null;

/**
 * @returns {EffectMan}
 */
EffectMan.getInstance = function() {
    if(!EffectMan._instance) {
        EffectMan._instance = new EffectMan();
    }
    return EffectMan._instance;
}

module.exports = EffectMan;
},{}],27:[function(require,module,exports){
var DAY_IN_SECONDS = 24 * 60 * 60;

var NOTIFICATION_DAYS = [1, 3, 7, 15, 30];
var AdsPlace = require("../enum/AdsPlace");

var LogicMan = cc.Class.extend({
    _isRegisterGameEventListener: false,
    _start: false,
    ctor: function() {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge = jsb_dp.OneSDKJSBridge.getInstance();
            if (jsb_dp.LogicJSBridge && jsb_dp.LogicJSBridge.getInstance) {
                jsb_dp.logicBridge = jsb_dp.LogicJSBridge.getInstance();
            }
        }

        var EventDispatcher = require("../events/EventDispatcher");
        var NotificationManager = require("../manager/NotificationManager");
        var AnalyseManager = require("../manager/AnalyseManager");
        var StoreManager = require("../manager/StoreManager");
        var GCManager = require("../manager/GCManager");
        var RateManager = require("../manager/RateManager");
        var PlayerMan = require("../model/PlayerMan");
        var StorageController = require("../storage/StorageController");
        var AdsManager = require("../manager/AdsManager");
        var AudioPlayer = require("../audio/AudioPlayer");
        var Utils = require("../util/Utils");
        var ShareManager = require("../manager/ShareManager");
        var DialogManager = require("../popup/DialogManager");
        var AssetsManager = require("../assets/AssetsManager");

        var BaseCCBController = require("../controller/BaseCCBController");
        var AudioHelper = require("../util/AudioHelper");
        var CaptureManager = require("../manager/CaptureManager");
        var LocalizationManager = require("../manager/LocalizationManager");
        var CrossPromManager = require("../manager/CrossPromManager");
        var EffectMan = require("../model/EffectMan");
        //var ABTest = require("../ABTest/ABTest");
        var RemoteConfigManager = require("../manager/RemoteConfigManager");

        window.game = {};
        window.game.utils = Utils;
        window.game.eventDispatcher = EventDispatcher.getInstance();
        window.game.logicMan = this;
        window.game.notificationManager = NotificationManager.getInstance();
        window.game.analyseManager = AnalyseManager.getInstance();
        window.game.storeManager = StoreManager.getInstance();
        window.game.gcManager = GCManager.getInstance();
        window.game.rateManager = RateManager.getInstance();
        window.game.playerMan = PlayerMan.getInstance();
        window.game.storageController = StorageController.getInstance();
        window.game.adsManager = AdsManager.getInstance();
        window.game.audioPlayer = AudioPlayer.getInstance();
        window.game.shareManager = ShareManager.getInstance();
        window.game.dialogManager = DialogManager.getInstance();
        window.game.assetsManager = AssetsManager.getInstance();
        window.game.captureManager = CaptureManager.getInstance();
        window.game.local = LocalizationManager.getInstance();
        window.game.effectMan = EffectMan.getInstance();
        //window.game.abtest = ABTest;
        window.game.remoteConfig = RemoteConfigManager.getInstance();

        window.BaseCCBController = BaseCCBController;
        window.AudioHelper = AudioHelper;

        var GameBridge = require("../bridge/GameBridge");
        window.GameBridge = GameBridge;
        window.game.config = GameBridge.getConfig();
        window.game.popupMan = GameBridge.getPopupMan();
        window.game.gameMan = GameBridge.getGameMan();

        window.game.crossPromMan = CrossPromManager.getInstance();
        window.game.adsHelper = GameBridge.getAdsHelper();

        _ = function (key) {
            return game.local.getValue(key);
        };
    },

    init: function () {
    },

    registerGameEventListener: function() {
        if(!this._isRegisterGameEventListener) {
            this._isRegisterGameEventListener = true;
            game.eventDispatcher.addCustomEventListener(cc.game.EVENT_SHOW, this.gameOnShow, this);
            game.eventDispatcher.addCustomEventListener(cc.game.EVENT_HIDE, this.gameOnHide, this);
        }
    },

    purge: function() {
        game.eventDispatcher.removeCustomEventListener(cc.game.EVENT_SHOW, this.gameOnShow, this);
        game.eventDispatcher.removeCustomEventListener(cc.game.EVENT_HIDE, this.gameOnHide, this);
    },

    gameOnShow: function() {
        game.notificationManager.unscheduleNotification();

        game.adsManager.onGameOnShow();

        setTimeout(function () {
            game.adsHelper.showBackgroundAds();
        }.bind(this), 100);
    },

    gameOnHide: function() {
        if (cc.sys.isNative) {
            this.scheduleLocalNotification();
        }
        game.adsManager.setInterstitialShowed(AdsPlace.BackGround);
        this.lastHideTime = Date.now();
    },

    registerNotification: function () {
        game.notificationManager.registerNotification();
    },

    startGame: function (notInitPlayer) {
        if (this._start) {
            return;
        }
        this._start = true;
        game.notificationManager.unscheduleNotification();
        this.registerGameEventListener();

        if (!notInitPlayer) {
            game.playerMan.initData();
        }
        game.adsManager.init();
        game.adsManager.loadRemoteData();
        game.analyseManager.initAnalytics();
        game.gcManager.isGameCenterAvailable();
        game.rateManager.init(3, 1, 0.5, 0.5, true);
        game.analyseManager.trackLoginEvent();
        game.crossPromMan.tryToLoadFromRemote();
        game.adsManager.setIsNewPlayer(game.playerMan.isNewPlayer());
    },

    scheduleLocalNotification: function () {
        if (!cc.sys.isNative) {
            return;
        }


        var leftTimeSeconds = Math.floor(game.gameMan.getWheelLeftTime() / 1000);
        if (leftTimeSeconds < 30 * 60) {
            leftTimeSeconds = 30 * 60;
        }
        var index = 1;
        //wheel notification.
        game.notificationManager.scheduleNotification(leftTimeSeconds,
            _("wheel_is_ready"), game.local.getValue("app_name"), index++);

        //daily bonus notification.
        var lastClaimDay = game.playerMan.player.lastClaimDailyBonusDay;
        var currentDayClaimed = (lastClaimDay >= game.utils.getDayByTs(Date.now()));
        var dailyBonusSeconds = 0;
        if (currentDayClaimed) {
            var nextDayTime = (game.utils.getDayByTs(Date.now()) + 1) * (24 * 3600 * 1000);
            dailyBonusSeconds = (nextDayTime - Date.now()) / 1000;
        }
        if (dailyBonusSeconds <= 60 * 60) {
            dailyBonusSeconds = 60 * 60;
        }
        game.notificationManager.scheduleNotification(dailyBonusSeconds,
            _("daily_bonus_is_ready"), game.local.getValue("app_name"), index++);

        var maxTime = Math.max(leftTimeSeconds, dailyBonusSeconds);

        //normal notification.
        for (var i = 0; i < NOTIFICATION_DAYS.length; ++i) {
            game.notificationManager.scheduleNotification(maxTime + DAY_IN_SECONDS * NOTIFICATION_DAYS[i],
                game.local.getValue(game.utils.sprintf("noti_tips%d", i + 1)), game.local.getValue("app_name"), index++);
        }
    },

    rsyncUserDataFromGC: function () {
        //var highLevel = game.gcManager.highScoreForLeaderboard(game.config.getLeaderBoardKey());
        //if (highLevel > game.playerMan.getLevel()) {
        //    game.playerMan.setLevel(highLevel);
        //}
    }
});

LogicMan._instance = null;
LogicMan._firstUseInstance = true;

/**
 *
 * @returns {LogicMan}
 */
LogicMan.getInstance = function () {
    if (LogicMan._firstUseInstance) {
        LogicMan._firstUseInstance = false;
        LogicMan._instance = new LogicMan();
    }
    return LogicMan._instance;
};

module.exports = LogicMan;
},{"../assets/AssetsManager":1,"../audio/AudioPlayer":2,"../bridge/GameBridge":3,"../controller/BaseCCBController":4,"../enum/AdsPlace":10,"../events/EventDispatcher":12,"../manager/AdsManager":15,"../manager/AnalyseManager":16,"../manager/CaptureManager":17,"../manager/CrossPromManager":18,"../manager/GCManager":19,"../manager/LocalizationManager":20,"../manager/NotificationManager":21,"../manager/RateManager":22,"../manager/RemoteConfigManager":23,"../manager/ShareManager":24,"../manager/StoreManager":25,"../model/EffectMan":26,"../model/PlayerMan":28,"../popup/DialogManager":30,"../storage/StorageController":32,"../util/AudioHelper":33,"../util/Utils":35}],28:[function(require,module,exports){
/**
 * Created by qinning on 15/5/12.
 */
var PlayerInfo = require("../entity/PlayerInfo");

var PLAYER_KEY = "player_key";

var PlayerMan = cc.Class.extend({
    player: null,
    bestScoreKey: null,
    levelBoardKey: null,
    ctor: function () {
    },

    initData: function () {
        var playerInfoStr = game.storageController.getItem(PLAYER_KEY, null);
        var player;
        if (playerInfoStr == null || playerInfoStr == "") {
            player = PlayerInfo.createDefault();
            game.storageController.setItem(PLAYER_KEY, JSON.stringify(player));
        } else {
            player = new PlayerInfo();
            player.unmarshall(JSON.parse(playerInfoStr));
        }
        this.player = player;
    },

    getBestScore: function () {
        return this.player.bestScore;
    },

    getLevel: function () {
        if (cc.isUndefined(this.player.level)) {
            return 1;
        } else {
            return this.player.level;
        }
    },

    setLevel: function (level) {
        this.player.level = level;
        this._flushToStorage();
    },

    updateLevelStar: function (level, levelStar) {
        if (cc.isUndefined(this.player.levelMap[level]) || this.player.levelMap[level] < levelStar) {
            this.player.levelMap[level] = levelStar;
            game.gcManager.reportScore(level, this.getLevelBoardKey());
            this._flushToStorage();
        }
    },

    getLevelStar: function (level) {
        return this.player.levelMap[level] || 0;
    },

    addLevel: function () {
        game.gcManager.reportScore(this.player.level, this.getLevelBoardKey());
        this.player.level++;
        this.player.progress = 0;
        this._flushToStorage();
    },

    updateBestScore: function (newBestScore) {
        if (newBestScore > this.player.bestScore) {
            this.player.bestScore = newBestScore;
            game.gcManager.reportScore(newBestScore, this.getBestScoreBoardKey());
            this._flushToStorage();
            return true;
        }
        return false;
    },

    getLevelBoardKey: function () {
        return this.levelBoardKey || game.config.getLeaderBoardKey();
    },

    getBestScoreBoardKey: function () {
        return this.bestScoreKey || game.config.getLeaderBoardKey();
    },

    setLevelBoardKey: function (key) {
        this.levelBoardKey = key;
    },

    setBestScoreBoardKey: function (bestScoreKey) {
        this.bestScoreKey = bestScoreKey;
    },

    updateProgress: function (progress) {
        if (this.player.progress < progress) {
            this.player.progress = progress;
            this._flushToStorage();
        }
    },

    removedAds: function () {
        this.player.removedAds = true;
        game.adsManager.removeBannerAds();
        this._flushToStorage();
    },

    setRated: function () {
        this.player.rated = true;
        this._flushToStorage();
    },

    _flushToStorage: function () {
        game.storageController.setItem(PLAYER_KEY, JSON.stringify(this.player));
    }
});

PlayerMan._instance = null;
PlayerMan._firstUseInstance = true;

/**
 *
 * @returns {PlayerMan}
 */
PlayerMan.getInstance = function () {
    if (PlayerMan._firstUseInstance) {
        PlayerMan._firstUseInstance = false;
        PlayerMan._instance = new PlayerMan();
    }
    return PlayerMan._instance;
};

module.exports = PlayerMan;
},{"../entity/PlayerInfo":8}],29:[function(require,module,exports){
/**
 * Created by qinning on 15/4/22.
 */
var HttpClient = {

    /**
     * get request,jsb ok,html5 shows  No 'Access-Control-Allow-Origin' header is present on the requested resource
     * @param {string} url
     * @param {function} callback
     */
    doGet: function (url, callback) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onreadystatechange = function () {
            cc.log("readyState:"+xhr.readyState+",status:"+xhr.status+",statuText:"+xhr.statusText+",,,responseText:"+xhr.responseText);
            if (xhr.readyState == 4 && xhr.status == 200) {
                var httpStatus = xhr.statusText;
                var response = xhr.responseText;
                callback(null,response);
            }else{
                callback(xhr.statusText);
            }
        };
        xhr.send();
    },

    /**
     *
     * @param {string} url
     * @param {string} param
     * @param {Object.<string,string>} headers
     * @param {Function} callback
     */
    doPost: function (url, params, headers, callback) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url);
        for (var key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status <= 207) {
                    callback(null, xhr.responseText);
                } else {
                    callback(xhr.status, xhr.statusText);
                }
            }
        };
        try {
            xhr.send(params);
        } catch (e) {
        }
    }
};

module.exports = HttpClient;
},{}],30:[function(require,module,exports){
var ModalLayer = require("./ModalLayer");

var DialogManager = cc.Class.extend({
    DIALOG_ZORDER_BEGIN: 999,
    DIALOG_ZORDER_STEP: 2,

    /**
     * @types {ModalLayer}
     */
    _overlay: null,
    _scaleFactor: 0,
    /**
     * @types {Array.<ModalLayer>}
     */
    _dialogStack: null,

    ctor: function () {
    },

    createOverlay: function () {
        this._overlay = new ModalLayer();
        this._overlay.setColor(cc.color.BLACK);
        this._overlay.setOpacity(190);
        this._overlay.setContentSize(cc.size(cc.winSize.width, cc.winSize.height));
        this._overlay.setLocalZOrder(999);
        this._overlay.retain();
        this._scaleFactor = 1.0;
        this._dialogStack = [];
    },

    popup: function (dlg, param) {
        dlg.ignoreAnchorPointForPosition(false);
        dlg.setScale(this._scaleFactor);
        var dlgLen = this._dialogStack.length;
        cc.log("dlgLen:" + dlgLen);
        if (dlgLen == 0) {
            dlg.setLocalZOrder(this.DIALOG_ZORDER_BEGIN);
        }
        else {
            dlg.setLocalZOrder(this._dialogStack[dlgLen - 1].getLocalZOrder() + this.DIALOG_ZORDER_STEP);
        }
        this._dialogStack.push(dlg);
        this._overlay.setLocalZOrder(dlg.getLocalZOrder() - 1);

        if (this._overlay.getParent() == null) {
            this.attachScene(this._overlay);
        }

        if (param && param.overlayColor) {
            this._overlay.setColor(param.overlayColor);
        } else {
            this._overlay.setColor(cc.color.BLACK);
        }

        if (param && param.overlayOpacity) {
            this._overlay.setOpacity(param.overlayOpacity);
        } else {
            this._overlay.setOpacity(190);
        }

        if (param && param.popupAnim) {
            if (dlg.getChildren() && dlg.getChildren().length > 0) {
                //this._overlay.setLocalZOrder(dlg.getLocalZOrder() + 1);
                this.popupDialogAnim(dlg.getChildren()[0], function () {
                    //this._overlay.setLocalZOrder(dlg.getLocalZOrder() - 1);
                }, this);
            }
        }

        this.attachScene(dlg);

        game.eventDispatcher.dispatchEvent("dialog_poped");
    },

    popupDialogAnim: function (panel,callback,callbackTarget) {
        panel.setScale(0.8, 0.8);
        panel.runAction(cc.sequence(
            cc.scaleTo(0.066, 1.05, 1.05).easing(cc.easeOut(2)),
            cc.scaleTo(0.05, 0.98, 0.98).easing(cc.easeOut(2)),
            cc.scaleTo(0.084, 1, 1).easing(cc.easeOut(2)),
            cc.callFunc(callback, callbackTarget)
        ));
    },

    attachScene: function (node) {
        cc.director.getRunningScene().addChild(node);
    },

    close: function (dlg, dispose) {
        if (cc.isUndefined(dispose)) {
            dispose = true;
        }
        var closeIndex;
        var dlgLen = this._dialogStack.length;
        for (closeIndex = dlgLen - 1; closeIndex >= 0; --closeIndex) {
            if (dlg === this._dialogStack[closeIndex]) {
                break;
            }
        }

        if (closeIndex >= 0) {
            this._dialogStack.splice(closeIndex, 1);
            dlgLen = this._dialogStack.length;
            dlg.removeFromParent(dispose);
        } else {
            return;
        }

        if (dlgLen === 0) {
            this._overlay.removeFromParent(false);
        } else {
            var topIndex = dlgLen - 1;

            if (topIndex >= 0) {
                this._overlay.setLocalZOrder(this._dialogStack[topIndex].getLocalZOrder() - 1);
            } else {
                this._overlay.removeFromParent(false);
                this._dialogStack.length = 0;
            }
        }
        game.eventDispatcher.dispatchEvent("dialog_closed");
    },

    closeAll: function () {
        var dlgLen = this._dialogStack.length;
        while (dlgLen != 0) {
            var modalLayer = this._dialogStack[dlgLen - 1];
            this.close(modalLayer, true);
            dlgLen = this._dialogStack.length;
        }
    },

    isTopestDialog: function (node) {
        return (this._dialogStack[this._dialogStack.length - 1] === node);
    }

});

DialogManager._instance = null;
DialogManager._firstUseInstance = true;

/**
 *
 * @returns {DialogManager}
 */
DialogManager.getInstance = function () {
    if (DialogManager._firstUseInstance) {
        DialogManager._firstUseInstance = false;
        DialogManager._instance = new DialogManager();
    }
    return DialogManager._instance;
};

module.exports = DialogManager;
},{"./ModalLayer":31}],31:[function(require,module,exports){
/**
 * Created by qinning on 15/4/28.
 */
var ModalLayer = cc.LayerColor.extend({
    ctor:function(){
        this._super();
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan.bind(this)
        }, this);
    },
    onTouchBegan:function(touch, event) {
        if(!this.isVisible() || (!this.isTouchInside(this,touch))){
            return false;
        }
        return true;
    },
    isTouchInside: function (owner,touch) {
        if(!owner || !owner.getParent()){
            return false;
        }
        var touchLocation = touch.getLocation(); // Get the touch position
        touchLocation = owner.getParent().convertToNodeSpace(touchLocation);
        return cc.rectContainsPoint(owner.getBoundingBox(), touchLocation);
    }
});

module.exports = ModalLayer;
},{}],32:[function(require,module,exports){
/**
 * Created by qinning on 15/4/23.
 */

var StorageController = cc.Class.extend({
    setItem: function (key, value) {
        cc.sys.localStorage.setItem(key, value);
    },
    getItem: function (key, defaultValue) {
        var value = cc.sys.localStorage.getItem(key);
        if (value == "" || value == null) {
            return defaultValue;
        }
        return value;
    },
    removeItem: function (key) {
        cc.sys.localStorage.removeItem(key);
    }
});

StorageController._instance = null;
StorageController._firstUseInstance = true;

/**
 *
 * @returns {StorageController}
 */
StorageController.getInstance = function () {
    if (StorageController._firstUseInstance) {
        StorageController._firstUseInstance = false;
        StorageController._instance = new StorageController();
    }
    return StorageController._instance;
};

module.exports = StorageController;
},{}],33:[function(require,module,exports){
/**
 * Created by oye on 16/3/12.
 */

var AudioHelper = {
    playBtnSound: function () {
        game.audioPlayer.playEffectByKey("enter");
    }
};

module.exports = AudioHelper;
},{}],34:[function(require,module,exports){
var FileCacheStub = function() {
    this.cachedFiles = [];
};

FileCacheStub.prototype.cacheFile = function(filename) {
    if (cc.sys.isNative) {
        if(cc.sys.os == cc.sys.OS_ANDROID) {
            // cc.log("FileCacheStub.prototype.cacheFile.android");
            if(jsb.fileUtils.cacheFile) {
                var ret = jsb.fileUtils.cacheFile(filename);
                // cc.log("FileCacheStub.prototype.cacheFile ----> cache:" + filename + ", ret:" + ret);
                this.cachedFiles.push(filename);
            }
        }
    }
};

FileCacheStub.prototype.clear = function() {
    if (cc.sys.isNative) {
        if(cc.sys.os == cc.sys.OS_ANDROID) {
            if (jsb.fileUtils.uncacheFile) {
                this.cachedFiles.forEach(function (filename) {
                    jsb.fileUtils.uncacheFile(filename);
                    // cc.log("FileCacheStub.prototype.dispose ----> uncached file " + filename);
                });
            }
            this.cachedFiles = [];
        }
    }
};

module.exports = FileCacheStub;
},{}],35:[function(require,module,exports){
/**
 * Created by oye on 15-4-19.
 */


var Utils = {
    /**
     * Generate a random integer value which meets [0, upperValue)
     * @param {number} upperValue
     * @returns {number}
     */
    randomNextInt: function(upperValue) {
        return Math.floor(Math.random() * upperValue);
    },

    /**
     * generate a random number value which meets [0, upperValue)
     * @param upperValue
     * @returns {number}
     */
    randomNextNumber: function (upperValue) {
        return Math.random() * upperValue;
    },

    /**
     * random a integer from [min, max]
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    rangeNextInt: function(min, max) {
        return min + this.randomNextInt(max - min + 1);
    },

    rangeNextNumber: function (min, max) {
        return min + this.randomNextNumber(max - min);
    },

    /**
     * Generate a random number value which meets [lowerValue, upperValue)
     * @param {number} lowerValue
     * @param {number} upperValue
     * @returns {number}
     */
    randomNextNumberInRange: function (lowerValue, upperValue) {
        return Math.random() * (upperValue - lowerValue) + lowerValue;
    },

    /**
     * Generate a random integer value which meets [lowerValue, upperValue)
     * @param {number} lowerValue
     * @param {number} upperValue
     * @returns {number}
     */
    randomNextIntInRange: function (lowerValue, upperValue) {
        return Math.floor(Math.random() * (upperValue - lowerValue) + lowerValue);
    },

    /**
     * 格式化字符串
     * @returns {string}
     */
    sprintf: function () {
        var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
        while (f) {
            if (m = /^[^\x25]+/.exec(f)) {
                o.push(m[0]);
            }
            else if (m = /^\x25{2}/.exec(f)) {
                o.push('%');
            }
            else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
                if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
                    throw('Too few arguments.');
                }
                if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
                    throw('Expecting number but found ' + typeof(a));
                }
                switch (m[7]) {
                    case 'b':
                        a = a.toString(2);
                        break;
                    case 'c':
                        a = String.fromCharCode(a);
                        break;
                    case 'd':
                        a = parseInt(a);
                        break;
                    case 'e':
                        a = m[6] ? a.toExponential(m[6]) : a.toExponential();
                        break;
                    case 'f':
                        a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a);
                        break;
                    case 'o':
                        a = a.toString(8);
                        break;
                    case 's':
                        a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a);
                        break;
                    case 'u':
                        a = Math.abs(a);
                        break;
                    case 'x':
                        a = a.toString(16);
                        break;
                    case 'X':
                        a = a.toString(16).toUpperCase();
                        break;
                }
                a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+' + a : a);
                c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
                x = m[5] - String(a).length - s.length;
                p = m[5] ? str_repeat(c, x) : '';
                o.push(s + (m[4] ? a + p : p + a));
            }
            else {
                throw('sprintf params error');
            }
            f = f.substring(m[0].length);
        }
        return o.join('');
    },

    getDistance : function(point1,point2){
        return Math.sqrt((point1.x - point2.x) * (point1.x - point2.x) + (point1.y - point2.y) * (point1.y - point2.y));
    },

    arrayContain : function (arr, element) {
        if(arr && arr.length > 0) {
            for(var i = 0; i < arr.length; ++i) {
                if(arr[i] == element) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * @param {string} ccbFileName
     * @param {string} containerNode
     * @param {string} controllerName
     * @param {object | cc.Node} controllerNode
     * @returns {cc.Node | null}
     */
    loadNodeFromCCB : function(ccbFileName,containerNode,controllerName,controllerNode, keepController){
        cc.log("load node from ccb:" + ccbFileName);
        Utils.setTrackValue("ccbName", ccbFileName);
        if(!cc.isUndefined(controllerName) && !cc.isUndefined(controllerNode)){
            cc.BuilderReader.registerController(controllerName,controllerNode);
        }
        var node = cc.BuilderReader.load(ccbFileName, containerNode);
        if (controllerName && controllerNode && !keepController) {
            cc.BuilderReader._controllerClassCache[controllerName] = undefined;
        }
        node.retain();
        cc.log("load node retain:" + ccbFileName);
        this.executeInNextFrame(function () {
            cc.log("load node release:" + ccbFileName);
            node.release();
        });
        return node;
    },

    registerController: function (controllerName, controllerNode) {
        cc.BuilderReader.registerController(controllerName, controllerNode);
    },

    unRegisterController: function (controllerName) {
        cc.BuilderReader._controllerClassCache[controllerName] = undefined;
    },

    /**
     *
     * @param {function} subType
     * @param {function} superType
     */
    inherits: function(subType, superType) {
        var subPrototype = Object.create(superType.prototype);
        subPrototype.constructor = subType;
        subType.prototype = subPrototype;
    },

    /**
     *
     * @param {string} url
     * @returns {Object}
     */
    loadJson: function (url) {
        if (!cc.sys.isNative) {
            return cc.loader.getRes(url);
        } else {
            if(jsb.fileUtils.isFileExist(url)) {
                return JSON.parse(jsb.fileUtils.getStringFromFile(url));
            } else {
                return null;
            }
        }
    },

    loadPlist: function (url) {
        if (!cc.sys.isNative) {
            return cc.loader.getRes(url);
        } else {
            if(jsb.fileUtils.isFileExist(url)) {
                return cc.plistParser.parse(jsb.fileUtils.getStringFromFile(url));
            } else {
                return null;
            }
        }
    },

    getScreenShot: function (fileName) {
        cc.log("fileName:" + fileName);
        var tex = new cc.RenderTexture(cc.winSize.width, cc.winSize.height, cc.Texture2D.PIXEL_FORMAT_RGBA8888);
        tex.setPosition(cc.p(cc.winSize.width / 2, cc.winSize.height / 2));
        tex.begin();
        cc.director.getRunningScene().visit();
        tex.end();

        var imgPath = jsb.fileUtils.getWritablePath();
        if (imgPath.length == 0) {
            return "";
        }
        var result = tex.saveToFile(fileName, cc.IMAGE_FORMAT_JPEG);
        if (result) {
            imgPath += fileName;
            cc.log("save image:" + imgPath);
            return imgPath;
        }
        return "";
    },

    isPad: function () {
        if (jsb_dp.oneSdkBridge.isPad) {
            return jsb_dp.oneSdkBridge.isPad();
        }
        var winSize = cc.winSize;
        if (!!GameBridge.getConfig().horizontalGame) {
            return (winSize.width / winSize.height < 1.5);
        } else {
            return (winSize.height / winSize.width < 1.5);
        }
    },

    getFormatRotation: function (rotation) {
        return ((rotation % 360) + 360) % 360;
    },

    doClipping: function (maskLayer, clipLayer) {
        if(maskLayer && clipLayer){
            var clipParentNode = clipLayer.getParent();
            clipLayer.retain();
            clipLayer.removeFromParent(false);

            maskLayer.removeFromParent(false);
            maskLayer.visible = true;

            var clippingNode = new cc.ClippingNode(maskLayer);
            clippingNode.alphaThreshold = 1;
            clippingNode.addChild(clipLayer);
            clipLayer.release();

            clipParentNode.addChild(clippingNode);
        }
    },

    isPixelCollision: function (spr1, spr2) {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isPixelCollision(spr1, spr2);
        } else {
            return cc.rectIntersectsRect(spr1.getBoundingBox(), spr2.getBoundingBox());
        }
    },

    scaleCCLabelBMFont: function (label, maxWidth) {
        if (label.width > maxWidth) {
            var scaleFactor = maxWidth / label.width;
            label.scaleX = label.scaleY = scaleFactor;
        } else {
            label.scaleX = label.scaleY = 1.0;
        }
    },

    scaleCCLabelBMFontWithMaxScale: function (label, maxWidth, maxScale) {
        if (label.width * label.scaleX > maxWidth) {
            label.scaleX = label.scaleY = maxWidth / label.width;
        }
        if (label.scaleX > maxScale) {
            label.scaleX = label.scaleY = maxScale;
        }
    },

    /**
     *
     * @param {cc.Node} node
     */
    walkNode: function (node, cb) {
        if(node) {
            var more = cb(node);
            if(more) {
                for(var k in node.children) {
                    more = this.walkNode(node.children[k], cb);
                    if(!more)
                        break;
                }
            }
            return more;
        }
        else {
            return true;
        }
    },

    isNodeButton: function(nd) {
        return (nd instanceof cc.ControlButton);
    },

    isNodeMenuItem: function(nd) {
        return (nd instanceof cc.MenuItem || nd instanceof cc.MenuItemImage);
    },

    isLabelBMFont:function (nd) {
        return (nd instanceof cc.LabelBMFont || nd instanceof cc.Label);
    },

    /**
     * Load an image with the given url
     * @param {string} url
     * @param {function} callback - function(error, texture, extra)
     * @param {*} extra
     */
    loadRemoteImg: function (url, callback, extra) {
        if (!cc.sys.isNative) {
            cc.loader.loadImg(url, {isCrossOrigin: true}, function (error, img) {
                var texture2d = new cc.Texture2D();
                texture2d.initWithElement(img);
                texture2d.handleLoadedTexture();
                callback(error, texture2d, extra);
            });
        } else {
            cc.loader.loadImg(url, {isCrossOrigin: true}, function (error, texture2d) {
                callback(error, texture2d, extra);
            });
        }
    },

    playCCBAnimation: function(node, anmName){
        var animMgr = node.animationManager;
        var seqId;
        if(anmName) {
            if (cc.sys.isNative){
                seqId = animMgr.getSequenceId(anmName);
            }
            else{
                seqId = animMgr._getSequenceId(anmName);
            }
        } else {
            seqId = animMgr.getAutoPlaySequenceId();
        }

        if (seqId != -1){
            if(!anmName) {
                animMgr.runAnimationsForSequenceIdTweenDuration(seqId, 0);
            } else {
                animMgr.runAnimationsForSequenceNamed(anmName);
            }
            return true;
        } else {
            cc.log("animation " + anmName + " not exists!");
            return false;
        }
    },

    randomScaleAnim: function (spr, startScale, totalTime) {
        totalTime = this.randomNextNumberInRange(totalTime * 0.8, totalTime * 1.2);
        var delayTime = this.randomNextNumber(totalTime / 2);

        var scaleBigTime = 0.3 * (totalTime - delayTime) * 2;
        var scaleSmallTime = 0.1 * (totalTime - delayTime) * 2;
        var scaleNormalTime = 0.1 * (totalTime - delayTime) * 2;

        spr.stopAllActions();
        spr.setScale(0);
        spr.runAction(cc.sequence(cc.delayTime(delayTime),
            cc.scaleTo(scaleBigTime, 1.1 * startScale).easing(cc.easeInOut(2)) ,
            cc.scaleTo(scaleSmallTime, 0.9 * startScale).easing(cc.easeInOut(2)),
            cc.scaleTo(scaleNormalTime, 1 * startScale).easing(cc.easeInOut(2))));
    },

    getFormatTime: function (time) {
        var decimals = time - Math.floor(time);
        time = Math.floor(time);
        if (time <= 60) {
            return "" + (time + decimals).toFixed(2);
        } else if (time <= 3600) {
            return Math.floor(time / 60) + ":" + ((time % 60) + decimals).toFixed(2);
        } else {
            return Math.floor(time / 3600) + ":" + Math.floor(time % 3600 / 60) + ":" + ((time % (3600 * 60)) + decimals).toFixed(2);
        }
    },

    getLongFormatTime: function (time) {
        return Math.floor(time / 3600) + ":" + Math.floor(time % 3600 / 60) + ":" + (time % (3600 * 60));
    },

    seekNodeByTag: function (rootNode, tag) {
        if (null === rootNode){
            return null;
        }
        if(rootNode.getTag() === tag){
            return rootNode;
        }
        var arrayRootChildren = rootNode.getChildren();
        if(arrayRootChildren && arrayRootChildren.length > 0) {
            var length = arrayRootChildren.length;
            for(var i = 0; i < length; i++) {
                var child = arrayRootChildren[i];
                if (null !== child){
                    var res = this.seekNodeByTag(child, tag);
                    if (null !== res) {
                        return res;
                    }
                }
            }
        }
        return null;
    },

    autoRelease: function (obj) {
        Utils.executeInNextFrame(function () {
            obj.release();
        });
    },

    executeInNextFrame: function (callback) {
        setTimeout(function () {
            if (callback) {
                callback();
            }
        }, 0);
    },

    isIOS: function () {
        if (cc.sys.os === cc.sys.OS_IOS) {
            return true;
        }
        return false;
    },

    getDayByTs: function(ts) {
        return Math.floor(ts / (1000 * 3600 * 24));
    },

    isSelfGame: function () {
        if (cc.sys.os === cc.sys.OS_IOS) {
            if (cc.sys.language === cc.sys.LANGUAGE_CHINESE) {
                return true;
            }
        } else {
            //var platformName = jsb_dp.oneSdkBridge.getChannelName();
            //if (platformName === "taptap") {
            //    return true;
            //}
            return this.isAndroidAndSelfGame();
        }
        return false;
    },

    isAndroidAndSelfGame: function () {
        return false;
        var platformName = jsb_dp.oneSdkBridge.getChannelName();
        if (platformName === "taptap") {
            return true;
        }
        return false;
    },

    getDashPointsNode: function (parent, points, dashArray, dashOffset, addDotFunc) {
        var lastx = points[0].x,
            lasty = points[0].y;

        var dx, dy;

        var totalLength = 0;
        var length = 0;

        var dashLength = dashArray.length;
        var dashIndex = 0;

        var from = dashOffset;
        var drawLength = dashArray[dashIndex];
        var to = dashOffset + drawLength;

        var x1, y1;
        var x, y;

        //var parent = new cc.Node();

        for (var i = 0, l = points.length; i < l; i++) {
            x = points[i].x;
            y = points[i].y;

            if (i !== 0) {
                dx = x - lastx;
                dy = y - lasty;

                length = Math.sqrt(dx * dx + dy * dy);

                if (!x1) x1 = lastx;
                if (!y1) y1 = lasty;

                while (length > 0) {
                    if (totalLength + length < from) {
                        totalLength += length;
                        length = 0;

                        x1 = x;
                        y1 = y;

                        continue;
                    }

                    if (totalLength <= from) {
                        var difLength = from - totalLength;
                        var p = difLength / length;

                        x1 = x1 + p * (x - x1);
                        y1 = y1 + p * (y - y1);

                        //ctx.moveTo(x1, y1);
                        addDotFunc(x1, y1)

                        length -= difLength;
                        totalLength += difLength;
                    }

                    if ((totalLength + length) < to) {
                        x1 = x;
                        y1 = y;

                        //ctx.lineTo(x1, y1);
                        addDotFunc(x1, y1);

                        totalLength += length;
                        length = 0;
                    }
                    else if ((totalLength + length) >= to) {
                        var difLength = to - totalLength;
                        var p = difLength / length;

                        x1 = x1 + p * (x - x1);
                        y1 = y1 + p * (y - y1);

                        //ctx.lineTo(x1, y1);
                        addDotFunc(x1, y1);

                        length -= difLength;
                        totalLength += difLength;

                        from = to + dashArray[++dashIndex % dashLength];
                        to = from + dashArray[++dashIndex % dashLength];
                    }
                }
            }

            lastx = x;
            lasty = y;
        }
        return parent;
    },

    isFileExist: function (fileName) {
        if (cc.sys.isNative) {
            if (jsb.fileUtils.isFileExist(fileName)) {
                return true;
            }
        } else {
            if (cc.loader.getRes(fileName)) {
                return true;
            }
        }
        return false;
    },

    /**
     * 判断宽高比是否大于2，如果大于2，则使用刘海屏适配方式来显示UI
     * @returns {boolean}
     */
    isNotchScreen: function () {
        if (cc.sys.isNative) {
            return jsb_dp.oneSdkBridge.isNotchScreen();
        }
        return false;
    },

    isAndroidNotchScreen: function () {
        if (cc.sys.isNative) {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                return jsb_dp.oneSdkBridge.isNotchScreen();
            }
        }
        return false;
    },

    isIOSNotchScreen: function () {
        if (cc.sys.isNative) {
            if (cc.sys.os === cc.sys.OS_IOS) {
                return jsb_dp.oneSdkBridge.isNotchScreen();
            }
        }
        return false;
    },

    loadIterator: function (funcList, callback) {
        var self = this;
        var func = funcList.shift();
        if (func) {
            Utils.executeInNextFrame(function () {
                func();
                self.loadIterator(funcList, callback);
            });
        } else {
            if (callback) {
                callback();
            }
        }
    },

    getTotalMemory: function () {
        if (cc.sys.isNative) {
            if (!this.totalMemory) {
                this.totalMemory = jsb_dp.oneSdkBridge.getTotalMemory();
            }
            return this.totalMemory;
        }
        return 0;
    },

    isLowAndroid: function () {
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            cc.log("memory: ", this.getTotalMemory());
            return (this.getTotalMemory() <= 1536);
        }
        return false;
    },

    isLowIOS: function () {
        if (cc.sys.os === cc.sys.OS_IOS) {
            cc.log("memory: ", this.getTotalMemory());
            return (this.getTotalMemory() <= 1024);
        }
        return false;
    },

    setTrackValue: function (name, value) {
        if (cc.sys.isNative) {
            jsb_dp.oneSdkBridge.setTrackValue(name, value);
        }
    },

    getReverseString: function (str) {
        return str.split('').reverse().join('');
    },

    getCurrentFPS: function () {
        if (game.utils.isLowAndroid()) {
            return game.config.lowAndroidFPS;
        }
        return 60;
    },

    createProgressTimer: function(sprite, horizontal, radial) {
        var pos = sprite.getPosition();
        var anchor = sprite.getAnchorPoint();
        var scaleX = sprite.getScaleX();
        var scaleY = sprite.getScaleY();
        var parent = sprite.getParent();
        sprite.retain();
        sprite.removeFromParent();
        var ret = new cc.ProgressTimer(sprite);
        sprite.release();
        if (!radial) {
            ret.setType(cc.ProgressTimer.TYPE_BAR);
            if(horizontal) {
                ret.setBarChangeRate(cc.p(1, 0));
                ret.setMidpoint(cc.p(0, 0.5));
            } else {
                ret.setBarChangeRate(cc.p(0, 1));
                ret.setMidpoint(cc.p(0.5, 0));
            }
        } else {
            ret.setType(cc.ProgressTimer.TYPE_RADIAL);
            ret.setAnchorPoint(cc.p(0.5, 0.5));
        }
        parent.addChild(ret);
        ret.setPosition(pos);
        ret.setAnchorPoint(anchor);
        ret.setScaleX(scaleX);
        ret.setScaleY(scaleY);
        return ret;
    },

    shuffle: function (vec) {
        if (!vec || vec.length === 0) return;
        vec.sort(function (a, b) {
            return Math.random() < 0.5 ? -1 : 1;
        });
    },

    clone: function(srcObj) {
        return JSON.parse(JSON.stringify(srcObj));
    }
};

module.exports = Utils;
},{}],36:[function(require,module,exports){
/**
 * Created by XinCheng on 8/18/16.
 */

var EasingFunctions = {
    // no easing, no acceleration
    linear: function (t) { return t; },
    // accelerating from zero velocity
    easeInQuad: function (t) { return t*t; },
    // decelerating to zero velocity
    easeOutQuad: function (t) { return t*(2-t); },
    // acceleration until halfway, then deceleration
    easeInOutQuad: function (t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; },
    // accelerating from zero velocity
    easeInCubic: function (t) { return t*t*t; },
    // decelerating to zero velocity
    easeOutCubic: function (t) { return (--t)*t*t+1; },
    // acceleration until halfway, then deceleration
    easeInOutCubic: function (t) { return t<0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; },
    // accelerating from zero velocity
    easeInQuart: function (t) { return t*t*t*t; },
    // decelerating to zero velocity
    easeOutQuart: function (t) { return 1-(--t)*t*t*t; },
    // acceleration until halfway, then deceleration
    easeInOutQuart: function (t) { return t<0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t; },
    // accelerating from zero velocity
    easeInQuint: function (t) { return t*t*t*t*t; },
    // decelerating to zero velocity
    easeOutQuint: function (t) { return 1+(--t)*t*t*t*t; },
    // acceleration until halfway, then deceleration
    easeInOutQuint: function (t) { return t<0.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t; },

    easeOutElastic: function(t){  var p = 0.4; return Math.pow(2,-10*t) * Math.sin((t-p/4)*(2*Math.PI)/p) + 1; },

    elastic: function(t, x) { return Math.pow(2, 10 * (t-1)) * Math.cos(20*Math.PI*x/3*t); },

    // 弹跳
    bounce: function(t) {
        for(var a = 0, b = 1; 1; a += b, b /= 2) {
            if (t >= (7 - 4 * a) / 11) {
                return -Math.pow((11 - 6 * a - 11 * t) / 4, 2) + Math.pow(b, 2);
            }
        }
    },

    //三次贝塞尔算法
    bseBase: function(t, p0, p1, p2, p3){
        var x = p0.x * (1 - t) * (1 - t) * (1 - t) + p1.x * 3 * t * (1 - t) * (1 - t) + p2.x * 3 * t * t * (1 - t) + p3.x * t * t * t;
        var y = p0.y * (1 - t) * (1 - t) * (1 - t) + p1.y * 3 * t * (1 - t) * (1 - t) + p2.y * 3 * t * t * (1 - t) + p3.y * t * t * t;
        return {x:x,y:y};
    },

    doShaking: function (t) {
        return -Math.sin(2 * Math.PI * 3 * t) * Math.pow((1 - t), 2);
    }

};

var Wheel = cc.Class.extend({
    target: null,                               // the target node you want to rotate
    bCurve: [0.42, -0.08, 0.58, 1.10],          // magic curve
    fps: 0,                                     // fps
    nRound: 1,                                  // move nRound x 360

    frameCount: 0,
    elapsedTime: 0,
    totalRotationTime: 0,
    startRotation: 0,       // the start rotation
    movement: 0,             // the movement degrees
    easyFunction: null,
    endCallback: null,
    targetRotation: 0,
    wheelItemAngle: 0,
    lastTime: 0,
    lastRotation: 0,
    speed: 0,

    _lotteryReseting: false,
    _isHighRotating: false,
    _startUpdate: false,


    /*
     * target: the node you want to rotate
     * fps: 30fps by default
     */
    ctor: function (target, fps) {
        this.target = target;
        this.fps = fps || 60;
    },

    /**
     * rotate the target node to the specified value
     * the index should start with 0
     * @param {number} rotationTime
     * @param {number} targetRotation
     * @param {number} wheelItemAngle
     * @param {Function} rollEndCallback
     */
    rotate: function (rotationTime, targetRotation, wheelItemAngle, rollEndCallback) {
        // I am moving
        if (this._startUpdate) {
            return;
        }

        this.targetRotation = targetRotation;
        this.frameCount = 0;
        this.totalRotationTime = rotationTime;

        this.startRotation = this.target.rotation % 360;
        this.movement = targetRotation - this.startRotation;
        this.wheelItemAngle = wheelItemAngle;

        this.lastTime = Date.now();
        this.lastRotation = 0;
        this._isHighRotating = false;
        this._lotteryReseting = false;

        this.easyFunction = this.defaultEasyFunction;
        //// use bezier
        //if (Array.isArray(params.easyFunction)) {
        //    this.bCurve = params.easyFunction;
        //    this.easyFunction = this.defaultEasyFunction;
        //}
        //// provide a function
        //else if (typeof easyFunction === 'function') {
        //    this.easyFunction = params.easyFunction;
        //}
        //// provide a functionName
        //else {
        //    this.easyFunction = EasingFunctions[params.easyFunction] || this.defaultEasyFunction;
        //}

        this.endCallback = rollEndCallback;

        this.scheduleUpdate();
        this._startUpdate = true;
    },

    scheduleUpdate: function () {
        this.elapsedTime = 0;
        cc.director.getScheduler().scheduleUpdateForTarget(this, 0, false);
    },

    unscheduleUpdate: function () {
        cc.director.getScheduler().unscheduleUpdateForTarget(this);
        this.elapsedTime = 0;
    },

    update: function (dt) {
        if (this._startUpdate) {
            this.moveByFrame(dt);
        }
    },

    /*rotate the reel frame by frame*/
    moveByFrame: function (dt) {
        // calculate elapsed time
        this.elapsedTime += dt;

        // calculate the moving progress
        var progress = this.easyFunction(this.elapsedTime / this.totalRotationTime);

        // do the rotation
        this.target.rotation = progress * this.movement + this.startRotation;

        //var hasStop = false;
        // stop here
        if (this.targetRotation <= this.target.rotation) {
            this.target.rotation = this.targetRotation;
            this.unscheduleUpdate();
            this._startUpdate = false;

            //game.audio.stopEffect("slots/roulette-bg");

            if (this.endCallback) {
                this.endCallback();
            }
        }

        this.speed = (this.target.rotation - this.lastRotation) / (Date.now() - this.lastTime) * 1000;

        this.lastTime = Date.now();
        this.lastRotation = this.target.rotation;
    },

    /* Use bezier Curive as default */
    defaultEasyFunction: function (t) {
        var bez = this.bCurve;
        var coord = EasingFunctions.bseBase(t, {x: 0, y: 0}, {x: bez[0], y: bez[1]}, {x: bez[2], y: bez[3]}, {
            x: 1,
            y: 1
        });
        return coord.y;
    },

    getTargetRotation: function () {
        return this.targetRotation;
    },

    getSpeed: function () {
        return this.speed;
    }
});


module.exports = Wheel;

},{}],37:[function(require,module,exports){
/**
 * A brief explanation for "project.json":
 * Here is the content of project.json file, this is the global configuration for your game, you can modify it to customize some behavior.
 * The detail of each field is under it.
 {
    "project_type": "javascript",
    // "project_type" indicate the program language of your project, you can ignore this field

    "debugMode"     : 1,
    // "debugMode" possible values :
    //      0 - No message will be printed.
    //      1 - cc.error, cc.assert, cc.warn, cc.log will print in console.
    //      2 - cc.error, cc.assert, cc.warn will print in console.
    //      3 - cc.error, cc.assert will print in console.
    //      4 - cc.error, cc.assert, cc.warn, cc.log will print on canvas, available only on web.
    //      5 - cc.error, cc.assert, cc.warn will print on canvas, available only on web.
    //      6 - cc.error, cc.assert will print on canvas, available only on web.

    "showFPS"       : true,
    // Left bottom corner fps information will show when "showFPS" equals true, otherwise it will be hide.

    "frameRate"     : 60,
    // "frameRate" set the wanted frame rate for your game, but the real fps depends on your game implementation and the running environment.

    "id"            : "gameCanvas",
    // "gameCanvas" sets the id of your canvas element on the web page, it's useful only on web.

    "renderMode"    : 0,
    // "renderMode" sets the renderer type, only useful on web :
    //      0 - Automatically chosen by engine
    //      1 - Forced to use canvas renderer
    //      2 - Forced to use WebGL renderer, but this will be ignored on mobile browsers

    "engineDir"     : "frameworks/cocos2d-html5/",
    // In debug mode, if you use the whole engine to develop your game, you should specify its relative path with "engineDir",
    // but if you are using a single engine file, you can ignore it.

    "modules"       : ["cocos2d"],
    // "modules" defines which modules you will need in your game, it's useful only on web,
    // using this can greatly reduce your game's resource size, and the cocos console tool can package your game with only the modules you set.
    // For details about modules definitions, you can refer to "../../frameworks/cocos2d-html5/modulesConfig.json".

    "jsList"        : [
    ]
    // "jsList" sets the list of js files in your game.
 }
 *
 */

cc.game.onStart = function() {
    if (!cc.sys.isNative && document.getElementById("cocosLoading"))
        document.body.removeChild(document.getElementById("cocosLoading"));

    cc.view.enableRetina(false);
    cc.view.adjustViewPort(true);

    var LogicMan = require("./common/model/LogicMan");
    LogicMan.getInstance().init();

    var Utils = require("./common/util/Utils");
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(1000, 1300, cc.ResolutionPolicy.SHOW_ALL);
    //if (cc.sys.isNative) {
    //    var width = 0;
    //    var height = 0;
    //    if (!!GameBridge.getConfig().horizontalGame) {
    //        height = 640;
    //        if (Utils.isPad()) {
    //            height = 768;
    //        }
    //        width = height * cc.winSize.width / cc.winSize.height;
    //        cc.log("cc.winSize.width:" + cc.winSize.width);
    //        cc.log("cc.winSize.height:" + cc.winSize.height);
    //
    //    } else {
    //        height = 1136;
    //        if (Utils.isPad()) {
    //            height = 1024;
    //        }
    //        width = height * cc.winSize.width / cc.winSize.height;
    //    }
    //    cc.log("width:" + width);
    //    cc.log("height:" + height);
    //    cc.view.setDesignResolutionSize(width, height, cc.ResolutionPolicy.SHOW_ALL);
    //} else {
    //    if (!!GameBridge.getConfig().horizontalGame) {
    //        cc.view.setDesignResolutionSize(960, 640, cc.ResolutionPolicy.SHOW_ALL);
    //    } else {
    //        cc.view.setDesignResolutionSize(640, 960, cc.ResolutionPolicy.SHOW_ALL);
    //    }
    //}

    // The game will be resized when browser size change
    cc.BuilderReader.setResourcePath("res/");
    cc.view.resizeWithBrowserSize(true);

    game.dialogManager.createOverlay();
    window.isEditor = true;

    var AdsReminderController = require("./many_bricks/controller/AdsReminderController");
    var DiamondsController = require("./many_bricks/controller/DiamondsController");
    cc.BuilderReader.registerController("AdsReminderController", new AdsReminderController());
    cc.BuilderReader.registerController("DiamondsController", new DiamondsController());

    if (cc.sys.isNative) {
        game.local.reload();
        cc.director.runScene(new GameBridge.getMenuScene());
    } else {
        cc.loader.loadJson("res/resource_list/resource_list.json", function (error, result) {
            if (!error) {
                cc.LoaderScene.preload(result, function () {
                    game.local.reload();
                    var EditorScene = require("./many_bricks/editor/scene/EditorScene");
                    cc.director.runScene(new EditorScene());
                }, this);
            }
        });
    }
};
cc.game.run();

},{"./common/model/LogicMan":27,"./common/util/Utils":35,"./many_bricks/controller/AdsReminderController":50,"./many_bricks/controller/DiamondsController":59,"./many_bricks/editor/scene/EditorScene":100}],38:[function(require,module,exports){

var BrickConfig = function () {
    this.width = 0;
    this.height = 0;
    this.x = 0;
    this.y = 0;
    this.type = 0;
};

BrickConfig.prototype.unmarshal = function (jsonObj) {
    this.x = jsonObj[0];
    this.y = jsonObj[1];
    this.width = jsonObj[2];
    this.height = jsonObj[3];
    this.type = jsonObj[4];
};

BrickConfig.prototype.getHardCfg = function () {
    var hardCfg = new BrickConfig();
    hardCfg.x = this.x * 2;
    hardCfg.y = this.y * 2;
    hardCfg.width = this.width * 2;
    hardCfg.height = this.height * 2;
    hardCfg.type = this.type;
    return hardCfg;
};

module.exports = BrickConfig;
},{}],39:[function(require,module,exports){

var CardConfig = function () {
    this.id = 0;
    this.count = 0;
    this.image = "";
};

CardConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.count = jsonObj["count"];
    this.image = jsonObj["image"];
};

module.exports = CardConfig;
},{}],40:[function(require,module,exports){
/**
 * Created by oye on 16/5/19.
 */
var Config = {
    itunesDownloadUrl: "itms-apps://itunes.apple.com/app/id1372837123?action=write-review",
    googlePlayUrl: "http://bit.ly/2O8G9vx",
    iosShortUrl: "https://apple.co/2UPCwz6",
    androidShortUrl: "http://bit.ly/2O8G9vx",
    appName: "Break Bricks",
    iosLeaderBoardKey: "com.douapp.manybricks.rank",
    iosHardLeaderBoardKey: "com.douapp.manybricks.hardrank",
    googlePlayLeaderBoardKey: "CgkIouCt0-kBEAIQAQ",
    facebookFanPageUrl: "https://www.facebook.com/PlayBreakBricks/",
    iosStarRankKey: "com.douapp.manybricks.starrank",
    IS_DEBUG: false,
    IS_ENABLE_HOT_UPDATE: false,

    getStarLeaderBoardKey: function () {
        return this.iosStarRankKey;
    },

    getLeaderBoardKey: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return this.googlePlayLeaderBoardKey;
        } else {
            return this.iosLeaderBoardKey;
        }
    },

    getHardBoardKey: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return this.googlePlayLeaderBoardKey;
        } else {
            return this.iosHardLeaderBoardKey;
        }
    },

    getPlatformDownloadUrl: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return this.googlePlayUrl;
        } else {
            return this.itunesDownloadUrl;
        }
    },

    getShortPlatformDownloadUrl: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return this.androidShortUrl;
        } else {
            return this.iosShortUrl;
        }
    },

    getCrossPromUrl: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return this.androidCrossPromUrl;
        } else {
            if (game.utils.isSelfGame()) {
                return this.cnCrossPromUrl;
            }
            return this.crossPromUrl;
        }
    },
    getPackageName: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            if (game.utils.isSelfGame()) {
                return "com.douapp.manybricks";
            } else {
                return "com.q1.breakbricks";
            }
        } else {
            return "com.douapp.manybricks";
        }
    },
    getAdUrl: function () {
        if (game.utils.isSelfGame()) {
            return this.cnNewAdConfigUrl;
        }
        return this.adConfigUrl;
    },
    horizontalGame: false,

    //bingchuan ad url.
    adConfigUrl: "https://onegameinc.github.io/many_bricks/game_bingchuan.html",
    //bingchuan prom url.
    crossPromUrl: "https://onegameinc.github.io/cross_promotion/config/many_bricks/cross_promotion_bingchuan.html",

    //old version cn ad url.
    cnAdConfigUrl: "https://onegameinc.github.io/many_bricks/game.html",
    //new version cn ad url.
    cnNewAdConfigUrl: "https://onegameinc.github.io/many_bricks/game_cn.html",
    //cn prom url.
    cnCrossPromUrl: "https://onegameinc.github.io/cross_promotion/config/many_bricks/cross_promotion.html",


    androidCrossPromUrl: "https://onegameinc.github.io/cross_promotion/config/many_bricks_android/cross_promotion.html",
    connectEmail: "bricks.crush.play@gmail.com",

    rewardAdMaxCountPerDay: 10,
    rewardDiamonds: 5,
    minPossibility: 0.01,
    estimatedRatio: 0.1,
    rewardDiamondMap: {
        "1": 1,
        "2": 3,
        "3": 5
    },
    relifeDiamonds: 50,
    skipDiamonds: 100,
    aimItemDiamonds: 50,
    lowAndroidFPS: 40,
    dailyDiamonds: 50
};

module.exports = Config;
},{}],41:[function(require,module,exports){
/**
 * Created by qinning on 2017/3/25.
 */
var LevelConfig = require("./LevelConfig");
//var PackageConfig = require("./PackageConfig");
var StoreConfig = require("./StoreConfig");
var WheelConfig = require("./WheelConfig");
var ShareConfig = require("./ShareConfig");
var SkinConfig = require("./SkinConfig");
var DailyBonusConfig = require("./DailyBonusConfig");
var StoreType = require("../enum/StoreType");
var TaskConfig = require("./TaskConfig");
var BoostType = require("../enum/BoostType");
var TaskOldConfig = require("./TaskOldConfig");
var CardConfig = require("./CardConfig");

var LevelConfigMan = cc.Class.extend({

    levelList: null,
    storeList: null,
    wheelList: null,
    boxWheelList: null,
    shareList: null,
    skinList: null,
    dailyBonusList: null,
    storeListWithoutFirstPurchase: null,
    taskList: null,
    oldTaskList: null,
    originalLevelList: null,
    cardConfigList: null,

    ctor: function () {
        this.storeList = [];
        this.levelList = [];
        this.wheelList = [];
        this.boxWheelList = [];
        this.shareList = [];
        this.skinList = [];
        this.dailyBonusList = [];
        this.storeListWithoutFirstPurchase = [];
        this.taskList = [];
        this.oldTaskList = [];
        this.cardConfigList = [];

        this.reload();
    },

    reload: function () {
        var i;

        var jsonObj = game.utils.loadJson("res/config/store_config.json");
        var storeConfigs = jsonObj["stores"];
        for (i = 0; i < storeConfigs.length; ++i) {
            var storeConfig = new StoreConfig();
            storeConfig.unmarshal(storeConfigs[i]);
            this.storeList.push(storeConfig);

            if (storeConfig.type === StoreType.FIRST_PURCHASE) {
                this.specialOfferCfg = storeConfig;
            } else {
                this.storeListWithoutFirstPurchase.push(storeConfig);
            }
        }

        this.reloadLevelConfig();

        jsonObj = game.utils.loadJson("res/config/data_config.json");
        var wheelConfigs = jsonObj["wheel"];
        var wheelConfig;
        for (i = 0; i < wheelConfigs.length; ++i) {
            wheelConfig = new WheelConfig();
            wheelConfig.unmarshal(wheelConfigs[i]);
            this.wheelList.push(wheelConfig);
        }

        var boxWheelConfigs = jsonObj["box"];
        for (i = 0; i < boxWheelConfigs.length; ++i) {
            wheelConfig = new WheelConfig();
            wheelConfig.unmarshal(boxWheelConfigs[i]);
            this.boxWheelList.push(wheelConfig);
        }

        var shareConfigs = jsonObj["share"];
        for (i = 0; i < shareConfigs.length; ++i) {
            var shareConfig = new ShareConfig();
            shareConfig.unmarshal(shareConfigs[i]);
            this.shareList.push(shareConfig);
        }

        var cardConfigs = jsonObj["cards"];
        for (i = 0; i < cardConfigs.length; ++i) {
            var cardConfig = new CardConfig();
            cardConfig.unmarshal(cardConfigs[i]);
            this.cardConfigList.push(cardConfig);
        }

        var dailyBonusConfigs = jsonObj["daily_bonus"];
        for (i = 0; i < dailyBonusConfigs.length; ++i) {
            var dailyBonusConfig = new DailyBonusConfig();
            dailyBonusConfig.unmarshal(dailyBonusConfigs[i]);
            if (dailyBonusConfig.type === BoostType.SKIN) {
                var getted = game.playerMan.hasSkin(dailyBonusConfig.arg1);
                if (getted) {
                    dailyBonusConfig.type = dailyBonusConfig.extra.type;
                    dailyBonusConfig.count = dailyBonusConfig.extra.count;
                    dailyBonusConfig.image = dailyBonusConfig.extra.image;
                }
            }

            this.dailyBonusList.push(dailyBonusConfig);
        }

        jsonObj = game.utils.loadJson("res/config/skins_config.json");
        var skinsConfigs = jsonObj["skins"];
        for (i = 0; i < skinsConfigs.length; ++i) {
            var skinConfig = new SkinConfig();
            skinConfig.unmarshal(skinsConfigs[i]);
            this.skinList.push(skinConfig);
        }

        jsonObj = game.utils.loadJson("res/config/task_config.json");
        var taskConfigs = jsonObj["tasks"];
        for (i = 0; i < taskConfigs.length; ++i) {
            var taskConfig = new TaskConfig();
            taskConfig.unmarshal(taskConfigs[i]);
            this.taskList.push(taskConfig);
        }

        jsonObj = game.utils.loadJson("res/config/task_old_config.json");
        var taskConfigs = jsonObj["tasks"];
        for (i = 0; i < taskConfigs.length; ++i) {
            var taskConfig = new TaskOldConfig();
            taskConfig.unmarshal(taskConfigs[i]);
            this.oldTaskList.push(taskConfig);
        }
    },

    reloadLevelConfig: function () {
        this.levelList = [];
        var levelConfigGroup = game.remoteConfig.getRemoteConfig("level_config_group");
        cc.log("remote config level_config_group:" + levelConfigGroup);
        var defaultConfigName = "res/config/LevelConfigs.json";
        var levelConfigName = defaultConfigName;
        if (levelConfigGroup && levelConfigGroup.length > 0) {
            levelConfigName = "res/config/level_configs-" + levelConfigGroup + ".json";
            if (!game.utils.isFileExist(levelConfigName)) {
                levelConfigName = defaultConfigName;
            }
        }
        var jsonObj = game.utils.loadJson(levelConfigName);
        var levelConfigs = jsonObj;
        this.originalLevelList = levelConfigs;
        for (var i = 0; i < levelConfigs.length; ++i) {
            var levelConfig = new LevelConfig();
            levelConfig.unmarshal(levelConfigs[i]);
            this.levelList.push(levelConfig);
        }
    },

    onRemoteConfigReceived: function () {
        this.reloadLevelConfig();
    },

    getCardList: function () {
        return this.cardConfigList;
    },

    getStoreList: function () {
        return this.storeList;
    },

    getStoreListWithoutFirstPurchase: function () {
        return this.storeListWithoutFirstPurchase;
    },

    getLevelList: function () {
        return this.levelList;
    },

    getLevelConfig: function (levelId) {
        return this.levelList[levelId - 1];
    },

    getOriginalLevelConfig: function (levelId) {
        return this.originalLevelList[levelId - 1];
    },

    getWheelList: function () {
        return this.wheelList;
    },

    getBoxWheelList: function () {
        return this.boxWheelList;
    },

    getShareList: function () {
        return this.shareList;
    },

    getSkinList: function () {
        return this.skinList;
    },

    getSkinListByType: function (type) {
        var list = [];
        for (var i = 0; i < this.skinList.length; ++i) {
            if (type === this.skinList[i].type) {
                list.push(this.skinList[i]);
            }
        }
        return list;
    },

    getTaskList: function () {
        return this.taskList;
    },

    getOldTaskList: function () {
        return this.oldTaskList;
    },

    getSkinCfg: function (skinId) {
        for (var i = 0; i < this.skinList.length; ++i) {
            if (skinId == this.skinList[i].id) {
                return this.skinList[i];
            }
        }
        return null;
    },

    getDailyBonusList: function () {
        return this.dailyBonusList;
    },

    getSpecialOfferCfg: function () {
        return this.specialOfferCfg;
    }

    //getPackage: function (packageId) {
    //    for (var i = 0; i < this.packageList.length; ++i) {
    //        if (this.packageList[i].id === packageId) {
    //            return this.packageList[i];
    //        }
    //    }
    //    return null;
    //}
});

LevelConfigMan._instance = null;
LevelConfigMan._firstUseInstance = true;

/**
 *
 * @returns {LevelConfigMan}
 */
LevelConfigMan.getInstance = function () {
    if (LevelConfigMan._firstUseInstance) {
        LevelConfigMan._firstUseInstance = false;
        LevelConfigMan._instance = new LevelConfigMan();
    }
    return LevelConfigMan._instance;
};

module.exports = LevelConfigMan;

},{"../enum/BoostType":110,"../enum/StoreType":120,"./CardConfig":39,"./DailyBonusConfig":42,"./LevelConfig":43,"./ShareConfig":44,"./SkinConfig":45,"./StoreConfig":46,"./TaskConfig":47,"./TaskOldConfig":48,"./WheelConfig":49}],42:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var DailyBonusConfig = function () {
    this.id = 0;
    this.type = 0;
    this.count = 0;
    //this.probability = 0;
    this.image = "";
    this.arg1 = "";
};

DailyBonusConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.type = jsonObj["type"];
    this.count = jsonObj["count"];
    //this.probability = jsonObj["probability"];
    this.image = jsonObj["image"];
    this.arg1 = jsonObj["arg1"];
    this.extra = jsonObj["extra"];
};

module.exports = DailyBonusConfig;


},{}],43:[function(require,module,exports){
/**
 * Created by qinning on 2017/3/25.
 */
var BrickConfig = require("./BrickConfig");

var LevelConfig = function () {
    this.lifeProbability = 0;
    this.boostProbability = 0;
    this.pixelWidth = 0;
    this.pixelHeight = 0;
    this.width = 0;
    this.height = 0;
    /**
     * @type {Array.<BrickConfig>}
     */
    this.obstacles = [];
    /**
     * @type {Array.<BrickConfig>}
     */
    this.bricks = [];
    this.starTime = 0;
};

LevelConfig.prototype.unmarshal = function (jsonObj) {
    this.lifeProbability = jsonObj["l"] || 0;
    this.boostProbability = jsonObj["b"] || 0;
    this.pixelWidth = jsonObj["pixelWidth"];
    this.pixelHeight = jsonObj["pixelHeight"];
    this.width = jsonObj["width"];
    this.height = jsonObj["height"];
    var i;
    var obstacles = jsonObj["obstacles"];
    for (i = 0; i < obstacles.length; ++i) {
        var obstacle = obstacles[i];
        var obstacleCfg = new BrickConfig();
        obstacleCfg.unmarshal(obstacle);
        this.obstacles.push(obstacleCfg);
    }

    var bricks = jsonObj["bricks"];
    for (i = 0; i < bricks.length; ++i) {
        var brick = bricks[i];
        var brickCfg = new BrickConfig();
        brickCfg.unmarshal(brick);
        this.bricks.push(brickCfg);
    }
    this.starTime = jsonObj["starTime"] || 0;
};

LevelConfig.prototype.getHardCfg = function () {
    var levelCfg = new LevelConfig();
    levelCfg.lifeProbability = this.lifeProbability;
    levelCfg.boostProbability = this.boostProbability * 0.9;
    levelCfg.pixelWidth = this.pixelWidth;
    levelCfg.pixelHeight = this.pixelHeight;
    levelCfg.width = this.width * 2;
    levelCfg.height = this.height * 2;
    levelCfg.obstacles = [];
    levelCfg.bricks = [];
    levelCfg.starTime = this.starTime * 1.2;
    var i;
    for (i = 0; i < this.obstacles.length; ++i) {
        levelCfg.obstacles.push(this.obstacles[i].getHardCfg());
    }
    for (i = 0; i < this.bricks.length; ++i) {
        levelCfg.bricks.push(this.bricks[i].getHardCfg());
    }
    return levelCfg;
};

module.exports = LevelConfig;
},{"./BrickConfig":38}],44:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var ShareConfig = function () {
    this.id = 0;
    this.image = "";
    this.desc = "";
};

ShareConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.image = jsonObj["image"];
    this.desc = jsonObj["desc"];
};

ShareConfig.prototype.copy = function () {
    var config = new ShareConfig();
    config.id = this.id;
    config.image = this.image;
    config.desc = this.desc;
    return config;
};

module.exports = ShareConfig;


},{}],45:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var SkinConfig = function () {
    this.id = 0;
    this.count = "";
    this.image = 0;
    this.scale = 1;
    this.type = 0;
};

SkinConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.count = jsonObj["count"];
    this.image = jsonObj["image"];
    this.scale = jsonObj["scale"] || 1;
    this.type = jsonObj["type"] || 2;
};

module.exports = SkinConfig;


},{}],46:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var StoreConfig = function () {
    this.id = 0;
    this.type = 0;
    this.name = "";
    this.price = 0;
    this.count = 1;
    this.image = "";
    this.pid = "";
    this.key = "";
    this.hot = false;
    this.best = false;
    this.data = null;
    this.original_price = 0;
    this.discount_multi = 0;
    this.extra = 0;
    this.priceUS = 0;
};

StoreConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.type = jsonObj["type"];
    this.name = jsonObj["name"];
    this.price = jsonObj["price"];
    this.count = jsonObj["count"];
    this.image = jsonObj["image"];
    this.pid = jsonObj["pid"];
    if (cc.sys.os === cc.sys.OS_ANDROID) {
        this.pid = jsonObj["pid_gp"];
    }
    this.key = jsonObj["key"];
    this.hot = jsonObj["hot"];
    this.best = jsonObj["best"];
    this.data = jsonObj["data"] || {};
    this.original_price = jsonObj["original_price"];
    this.discount_multi = jsonObj["discount_multi"];
    this.extra = jsonObj["extra"] || 0;
    this.priceUS = parseFloat(this.price.substr(1));
};

module.exports = StoreConfig;


},{}],47:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var TaskConfig = function () {
    this.id = 0;
    this.type = 0;
    this.count = "";
    this.rewardCount = 0;
};

TaskConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.type = jsonObj["type"];
    this.count = jsonObj["count"];
    this.rewardCount = jsonObj["rewardCount"];
};

module.exports = TaskConfig;


},{}],48:[function(require,module,exports){

/**
 * Created by qinning on 2017/12/15.
 */

var TaskOldConfig = function () {
    this.id = 0;
    this.count = "";
    this.image = 0;
    this.scale = 1;
    this.type = 0;
};

TaskOldConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.type = jsonObj["type"];
    this.count = jsonObj["count"];
    this.image = jsonObj["image"];
    this.scale = jsonObj["scale"] || 1;
};

module.exports = TaskOldConfig;


},{}],49:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */

var WheelConfig = function () {
    this.id = 0;
    this.type = 0;
    this.count = 0;
    this.probability = 0;
    this.image = "";
    this.scale = 1;
};

WheelConfig.prototype.unmarshal = function (jsonObj) {
    this.id = jsonObj["id"];
    this.type = jsonObj["type"];
    this.count = jsonObj["count"];
    this.probability = jsonObj["probability"];
    this.image = jsonObj["image"];
    this.scale = jsonObj["scale"] || 1;
};

module.exports = WheelConfig;


},{}],50:[function(require,module,exports){
var EventsName = require("../events/EventsName");

var AdsReminderController = function () {
    BaseCCBController.call(this);

    this.spReminder = null;
    this.lbReminder = null;
};

game.utils.inherits(AdsReminderController, BaseCCBController);

AdsReminderController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    game.eventDispatcher.addEventListener(EventsName.REWARDED_VIDEO_COUNT, this.onUpdateReminder, this);
};

AdsReminderController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.REWARDED_VIDEO_COUNT, this.onUpdateReminder, this);
    BaseCCBController.prototype.onExit.call(this);
};

AdsReminderController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.onUpdateReminder();
};

AdsReminderController.prototype.onUpdateReminder = function () {
    var count = game.config.rewardAdMaxCountPerDay - game.playerMan.getRewardAdPlaceCountPerDay();
    if (count < 0) {
        count = 0;
    }
    this.lbReminder.setString(count);
};

AdsReminderController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/ads_reminder_view.ccbi", null, "AdsReminderController", new AdsReminderController(), true);
    return node;
};

module.exports = AdsReminderController;
},{"../events/EventsName":122}],51:[function(require,module,exports){


var AimHelpController = function () {
    BaseCCBController.call(this);
    this.spHand = null;
};

game.utils.inherits(AimHelpController, BaseCCBController);

AimHelpController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.lbHelpInfo.setString(game.local.getValue("aim_help_content"));
    //this.lbHelpInfo.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
};

AimHelpController.prototype.getHandWorldPosition = function () {
    return this.spHand.parent.convertToWorldSpace(this.spHand.getPosition());
};

module.exports = AimHelpController;
},{}],52:[function(require,module,exports){
var EventsName = require("../events/EventsName");

var AimItemController = function () {
    BaseCCBController.call(this);

    this.btnAimItem = null;
    this.lbAimPrice = null;
    //this.lbAimTips = null;

    this.hided = false;
};

game.utils.inherits(AimItemController, BaseCCBController);

AimItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbAimPrice.setString(game.config.aimItemDiamonds);
};

AimItemController.prototype.tryAimItemClicked = function () {
    AudioHelper.playBtnSound();
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().tryAimItem(game.gameMan.levelId, function () {
        game.gameMan.tryAimItem();
        this.playHideAnim();
    }.bind(this));
};

AimItemController.prototype.playHideAnim = function () {
    if (this.hided) {
        return;
    }
    this.hided = true;
    this.btnAimItem.enabled = false;
    game.utils.playCCBAnimation(this.rootNode, "hide");

    this.rootNode.runAction(cc.sequence(cc.delayTime(0.5), cc.hide()));
};

AimItemController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/aim_item_view.ccbi", null, "AimItemController", new AimItemController(), true);
    return node;
};

module.exports = AimItemController;
},{"../events/EventsName":122,"../model/StoreHelper":129}],53:[function(require,module,exports){
//var SkinItemController = require("./SkinItemController");
//var ConfigMan = require("../config/ConfigMan");
//var EventsName = require("../events/EventsName");
//
//var GRID_SIZE = cc.size(350, 500);
//
//var StoreItemCellView = cc.TableViewCell.extend({
//    entity: null,
//    itemNode: null,
//    ctor: function () {
//        this._super();
//        this.itemNode = SkinItemController.createFromCCB();
//        this.addChild(this.itemNode);
//        this.itemNode.setPosition(cc.p(GRID_SIZE.width * 0.5, GRID_SIZE.height * 0.5));
//    },
//
//    initWith: function (entity, idx, inited) {
//        this.entity = entity;
//        this.itemNode.controller.initWith(entity, idx);
//    }
//});
var BoostType = require("../enum/BoostType");
var GameMan = require("../model/GameMan");

var BagController = function () {
    BaseCCBController.call(this);
    this.lbBoostName1 = null;
    this.lbBoostName2 = null;
    this.lbBoostDesc1 = null;
    this.lbBoostDesc2 = null;
    this.lbShareTips = null;
};

game.utils.inherits(BagController, BaseCCBController);

BagController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
};

BagController.prototype.onExit = function () {
    BaseCCBController.prototype.onExit.call(this);
};

BagController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbBoostName1.setString(_("boost_split_title") + " X" + (game.playerMan.getBoostCount(BoostType.SPLIT)));
    this.lbBoostName2.setString(_("boost_new_title") + " X" + (game.playerMan.getBoostCount(BoostType.THREE_BALL)));
    this.lbBoostDesc1.setString(_("boost_split_desc"));
    this.lbBoostDesc2.setString(_("boost_new_desc"));
    this.lbShareTips.setString("");//_("bag_share_tips"));
    this.lbTitle.setString(_("bag_title"));
};

BagController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

BagController.prototype.shareClicked = function (sender) {
    AudioHelper.playBtnSound();
    var share = GameMan.getInstance().getShareConfig();
    game.shareManager.wxShare(share, function (shared) {

    });
};

BagController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

BagController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

BagController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/bag_view.ccbi", null, "BagController", new BagController());
    return node;
};

module.exports = BagController;
},{"../enum/BoostType":110,"../model/GameMan":124}],54:[function(require,module,exports){
var GameMan = require("../model/GameMan");

var BoardController = function () {
    BaseCCBController.call(this);

    this.spCircle = null;
    this.ndBoard = null;
    this.spBall = null;
};

game.utils.inherits(BoardController, BaseCCBController);

BoardController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    GameMan.getInstance().updateSkin(this.spBall);
};

BoardController.prototype.initWith = function (ballWidth) {
    var scale = GameMan.getInstance().getCurrentSkinCfg().scale;
    this.spBall.scaleX = ballWidth / this.spBall.width * scale;
    this.spBall.scaleY = ballWidth / this.spBall.height * scale;
};

BoardController.prototype.hideBall = function () {
    this.spBall.visible = false;
};

BoardController.prototype.showBall = function () {
    this.spBall.visible = true;
};

BoardController.createFromCCB = function(ballWidth) {
    var node = game.utils.loadNodeFromCCB("res/game/board_view.ccbi", null, "BoardController", new BoardController());
    node.controller.initWith(ballWidth);
    return node;
};

module.exports = BoardController;
},{"../model/GameMan":124}],55:[function(require,module,exports){
var Wheel = require("../../common/wheel/Wheel");
var ConfigMan = require("../config/ConfigMan");
var BoostType = require("../enum/BoostType");
var StoreHelper = require("../model/StoreHelper");
var GameMan = require("../model/GameMan");
var WheelType = require("../enum/WheelType");
var CardItemController = require("./CardItemController");

var CardController = function () {
    BaseCCBController.call(this);

    this.X = 120;
    this.Y = 140;

    this.ndCard1 = null;
    this.ndCard2 = null;
    this.ndCard3 = null;
    this.ndCard4 = null;

    this.ndWatch = null;
    this.ndClose = null;

    this.cardList = null;
    this.cardNodes = null;
    this.intervalKey = null;

    this.cardCount = 0;
    this.cardAnimCount = 0;
};

game.utils.inherits(CardController, BaseCCBController);

CardController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    // this.intervalKey = setInterval(this.onUpdate.bind(this), 1000);
};

CardController.prototype.onExit = function () {
    // clearInterval(this.intervalKey);
    BaseCCBController.prototype.onExit.call(this);

    if (this.closeCallback) {
        this.closeCallback();
    }
};

CardController.prototype.onDidLoadFromCCB = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    var cardList = ConfigMan.getInstance().getCardList();

    this.cardList = game.utils.clone(cardList);
    for (var i = 0; i < this.cardList.length; ++i) {
        var card = this.cardList[i];
        card.count = game.utils.randomNextIntInRange(card.count - 3, card.count + 3);
    }
    game.utils.shuffle(this.cardList);

    this.cardNodes = [
        this["ndCard1"],
        this["ndCard2"],
        this["ndCard3"],
        this["ndCard4"]
    ];

    this.playShuffleAnim();

    this.ndWatch.visible = false;
    this.ndClose.visible = false;
};

CardController.prototype.initWith = function (callback) {
    this.closeCallback = callback;
};

CardController.prototype.playShuffleAnim = function () {
    var animTime = 0.5;
    var offsetX = 70;
    for (var i = 0; i < this.cardNodes.length; ++i) {
        var cardNode = this.cardNodes[i];
        cardNode.controller.initWith(this.cardList[i]);
        cardNode.startPos = cardNode.getPosition();
        cardNode.controller.showCardFront();
        cardNode.controller.enabledClick = false;
        cardNode.setPosition(cc.p(0, 0));
        var direction = ((i % 2) === 0) ? 1 : -1;
        var totalTime = 2.5;
        var action = cc.sequence(
            cc.delayTime(i * 0.5 + 0.5),//0.5, 1, 1.5, 2
            cc.callFunc(function () {
                game.audioPlayer.playEffectByKey("card_turn");
            }, this),
            cc.moveTo(animTime, cardNode.startPos),
            cc.delayTime(totalTime - i * 0.5 - 0.5),
            cc.callFunc(cardNode.controller.showCardBackAnim, cardNode.controller),
            cc.delayTime(1),
            cc.moveTo(animTime, cc.p(0, 0)),
            cc.callFunc(this.onShowShuffleAudio, this),
            cc.moveTo(animTime * 0.2, cc.p(direction * offsetX, 0)),
            cc.moveTo(animTime * 0.2, cc.p(0, 0)),
            cc.moveTo(animTime * 0.2, cc.p(-direction * offsetX, 0)),
            cc.moveTo(animTime * 0.2, cc.p(0, 0)),
            cc.moveTo(animTime * 0.2, cc.p(direction * offsetX, 0)),
            cc.moveTo(animTime * 0.2, cc.p(0, 0)),
            cc.moveTo(animTime * 0.2, cc.p(-direction * offsetX, 0)),
            cc.moveTo(animTime * 0.2, cc.p(0, 0)),
            cc.callFunc(this.onEndShuffleAudio, this),
            cc.moveTo(animTime, cardNode.startPos),
            cc.callFunc(this.onShuffled, this)
        );
        cardNode.runAction(action);
    }
};

CardController.prototype.onShowShuffleAudio = function () {
    if (this.showedShuffleAudio) {
        return;
    }
    this.showedShuffleAudio = true;
    game.audioPlayer.playEffectByKey("card_turn", true);
};

CardController.prototype.onEndShuffleAudio = function () {
    if (this.endShuffleAudio) {
        return;
    }
    this.endShuffleAudio = true;
    game.audioPlayer.stopEffect("card_turn");
};

CardController.prototype.onShuffled = function () {
    if (this.shuffled) {
        return;
    }
    cc.log("CardController.prototype.onShuffled");
    this.shuffled = true;
    game.utils.shuffle(this.cardList);
    for (var i = 0; i < this.cardNodes.length; ++i) {
        var cardNode = this.cardNodes[i];
        cardNode.controller.enabledClick = true;
        cardNode.controller.initWith(this.cardList[i], this.onShowCardCallback.bind(this), this.onCardAnimEndCallback.bind(this));
    }
};

CardController.prototype.onShowCardCallback = function () {
    this.cardCount++;
    game.audioPlayer.playEffectByKey("card_turn");
    if (this.cardCount >= 2) {
        cc.log("CardController.prototype.onShowCardCallback 1:" + this.cardCount);
        for (var i = 0; i < this.cardNodes.length; ++i) {
            var cardNode = this.cardNodes[i];
            cardNode.controller.enabledClick = false;
        }
    } else {
        cc.log("CardController.prototype.onShowCardCallback 2");
    }
};

CardController.prototype.onCardAnimEndCallback = function () {
    this.cardAnimCount++;
    if (this.cardAnimCount >= 2) {
        game.audioPlayer.playEffectByKey("card_turn");
        for (var i = 0; i < this.cardNodes.length; ++i) {
            var cardNode = this.cardNodes[i];
            cardNode.controller.stopClaimed = true;
            cardNode.controller.showCardFrontAnim();
        }
        this.ndWatch.visible = true;
        this.ndClose.visible = true;
        game.utils.playCCBAnimation(this.rootNode, "show");
    }
};

CardController.prototype.watchAdsClicked = function () {
    AudioHelper.playBtnSound();
    // this.close();
    StoreHelper.getInstance().checkAndShowRewardVideo("flip_card_again", function (watched) {
        if (watched) {
            this.close();
            game.popupMan.popupCard();
        }
    }.bind(this));
};

CardController.prototype.closeClicked = function () {
    AudioHelper.playBtnSound();
    this.close();
};

CardController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

CardController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

CardController.createFromCCB = function() {
    game.utils.registerController("CardItemController", new CardItemController());
    //var ccbiName = game.utils.isSelfGame() ? "res/wheel/wheel_view.ccbi" : "res/wheel/wheel_view_new.ccbi";
    var node = game.utils.loadNodeFromCCB("res/menu/cards_view.ccbi", null, "CardController", new CardController());
    game.utils.unRegisterController("CardItemController");
    return node;
};

module.exports = CardController;
},{"../../common/wheel/Wheel":36,"../config/ConfigMan":41,"../enum/BoostType":110,"../enum/WheelType":121,"../model/GameMan":124,"../model/StoreHelper":129,"./CardItemController":56}],56:[function(require,module,exports){
var BoostType = require("../enum/BoostType");

var CardItemController = function () {
    BaseCCBController.call(this);

    this.ANIM_TIME = 0.4;

    this.lblCount = null;
    this.spCardBack = null;
    this.spCardFront = null;

    this.spDiamond = null;

    this.ndCardBack = null;
    this.ndCardFront = null;

    this.cardData = null;

    this.enabledClick = false;

    this.stopClaimed = false;
};

game.utils.inherits(CardItemController, BaseCCBController);

CardItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};
/**
 * @param {CardConfig} data
 */
//day, state, rewardObj, claimed
CardItemController.prototype.initWith = function (data, showCardCallback, animEndCallback) {
    this.cardData = data;
    this.lblCount.setString("x" + data.count);
    this.showCardCallback = showCardCallback;
    this.animEndCallback = animEndCallback;
};

CardItemController.prototype.onCardClicked = function () {
    if (!this.enabledClick) {
        return;
    }
    // AudioHelper.playBtnSound();
    this.showCardFrontAnim();
};

CardItemController.prototype.showCardBack = function () {
    this.ndCardBack.visible = true;
    this.ndCardFront.visible = false;
    this.ndCardBack.scaleX = 1;
};

CardItemController.prototype.showCardFront = function () {
    this.ndCardBack.visible = false;
    this.ndCardFront.visible = true;
    this.ndCardFront.scaleX = 1;
};

CardItemController.prototype.showCardFrontAnim = function () {
    if (this.clicked) {
        return;
    }
    this.clicked = true;
    this.showCardCallback && this.showCardCallback();
    this.ndCardBack.visible = true;
    this.ndCardFront.visible = false;
    this.ndCardBack.scaleX = 1;
    this.ndCardBack.runAction(cc.sequence(
        cc.scaleTo(this.ANIM_TIME, 0, 1),
        cc.callFunc(this.onCardFrontShowed, this)
    ));
};

CardItemController.prototype.onCardFrontShowed = function () {
    this.ndCardFront.visible = true;
    this.ndCardBack.visible = false;
    this.ndCardFront.scaleX = 0;
    this.ndCardFront.runAction(cc.sequence(
        cc.scaleTo(this.ANIM_TIME, 1, 1),
        cc.callFunc(this.onCardShowed, this)
    ));
};

CardItemController.prototype.onCardShowed = function () {
    if (this.stopClaimed) {
        return;
    }
    var diamondPos = this.spDiamond.parent.convertToWorldSpace(this.spDiamond.getPosition());
    var diamndEndPos = cc.p(cc.winSize.width - 80, cc.winSize.height - 60);
    game.effectMan.playFlyCoins(diamondPos, diamndEndPos, 10, 1000, function () {
        game.playerMan.addDiamonds(this.cardData.count, "card_flip");
    }.bind(this), function () {
        //this.ndClaimDiamonds.runAction(cc.sequence(cc.delayTime(1), cc.fadeOut(0.3)));
        this.animEndCallback && this.animEndCallback();
    }.bind(this));
};

CardItemController.prototype.showCardBackAnim = function () {
    this.ndCardBack.visible = false;
    this.ndCardFront.visible = true;
    this.ndCardFront.scaleX = 1;
    this.ndCardFront.runAction(cc.sequence(
        cc.scaleTo(this.ANIM_TIME, 0, 1),
        cc.callFunc(this.onCardBackShowed, this)
    ));
};

CardItemController.prototype.onCardBackShowed = function () {
    this.ndCardFront.visible = false;
    this.ndCardBack.visible = true;
    this.ndCardBack.scaleX = 0;
    this.ndCardBack.runAction(cc.sequence(
       cc.scaleTo(this.ANIM_TIME, 1, 1),
        cc.callFunc(this.onCardBacked, this)
    ));
};

CardItemController.prototype.onCardBacked = function () {

};

CardItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/daily_bonus_item_view.ccbi", null, "CardItemController", new CardItemController());
};

module.exports = CardItemController;
},{"../enum/BoostType":110}],57:[function(require,module,exports){
var ConfigMan = require("../config/ConfigMan");
var DailyBonusItemController = require("./DailyBonusItemController");
var BoostType = require("../enum/BoostType");
var StoreHelper = require("../model/StoreHelper");

var DailyBonusController = function () {
    BaseCCBController.call(this);
    this.DAILY_BONUS_COUNT = 7;
    this.DAILY_BONUS_TAG = 200;
    this.ndContainer = null;

    this.lblTitle = null;

    this.ndDailyBonus = null;

    this.btnDouble = null;
    this.btnClaim = null;

    this.lblClaim = null;
    this.lblDouble = null;

    this.dailyBonusNodes = [];

    //user data.
    this.configs = null;

    this.curConfig = null;

    this.claimed = false;
};

game.utils.inherits(DailyBonusController, BaseCCBController);

DailyBonusController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lblTitle.setString(_("daily_bonus_title"));
    this.lblClaim.setString(_("claim_title"));
    this.lblDouble.setString(_("double_title"));

    this.configs = ConfigMan.getInstance().getDailyBonusList();

    for (var i = 0; i < this.DAILY_BONUS_COUNT; ++i) {
        var node = this.ndDailyBonus.getChildByTag(this.DAILY_BONUS_TAG + i);
        var itemNode = DailyBonusItemController.createFromCCB();
        this.dailyBonusNodes.push(itemNode);
        node.addChild(itemNode);
    }

    this.initUI();
};

DailyBonusController.prototype.initUI = function () {
    var lastClaimDay = game.playerMan.player.lastClaimDailyBonusDay;
    var consecutiveDay = game.playerMan.checkConsecutiveLoginDay();
    var currentDayClaimed = lastClaimDay >= game.utils.getDayByTs(Date.now());
    consecutiveDay %= 7;
    consecutiveDay = consecutiveDay || 7;
    this.claimed = currentDayClaimed;

    this.btnClaim.enabled = !currentDayClaimed;
    this.btnDouble.enabled = !currentDayClaimed;

    cc.log("consecutiveDay:" + consecutiveDay + ",dailyBonusNodes length:" + this.dailyBonusNodes.length + ",currentDayClaimed:" + currentDayClaimed);
    for (var i = 1; i <= 7; ++i) {
        cc.log("initUI:" + i);
        var config = this.configs[i - 1];
        var node = this.dailyBonusNodes[i - 1];
        if (!node) {
            cc.log("daily bonus node is null:" + i);
            continue;
        }
        var controller = node.controller;
        if (!controller) {
            cc.log("daily bonus controller is null:" + i);
            continue;
        }
        if (i < consecutiveDay) {
            controller.initWith(config, i, false, true);
        }
        else if (i === consecutiveDay) {
            controller.initWith(config, i, true, currentDayClaimed);
            this.curConfig = config;
        }
        else {
            controller.initWith(config, i, false, false);
        }
    }

    if (consecutiveDay === 3) {
        this.btnDouble.enabled = false;
    }
};

DailyBonusController.prototype.popupClaimReward = function (config, double, callback) {
    //var count = double ? config.count * 2 : config.count;
    var param = double ? 2 : 1;
    var count = config.count;
    var splitCount = 0;
    var threeBallCount = 0;
    var rewardName = game.utils.isIOS() ? "daily_bonus_tips" : "daily_bonus_tips";
    if (config.type === BoostType.SPLIT) {
        splitCount = count;
    } else if (config.type === BoostType.THREE_BALL) {
        threeBallCount = count;
    } else if (config.type === BoostType.GIFT) {
        splitCount = game.utils.randomNextIntInRange(2, 4);
        threeBallCount = game.utils.randomNextIntInRange(2, 4);
    } else if (config.type === BoostType.SKIN) {
        game.popupMan.popupRewardNoticeDlg(game.local.getValue("skin_claimed"),
            function () {
                game.playerMan.setClaimedSkin(config.arg1);
                if (callback) {
                    callback();
                }
            }, config.image, 1);
        return;
    } else if (config.type === BoostType.DIAMOND) {
        var diamondCount = config.count;
        if (double) {
            game.popupMan.popupRewardNoticeDlg(game.local.getValue("reward_video_diamonds"),
                function () {
                    game.playerMan.addDiamonds(diamondCount, rewardName);
                    if (callback) {
                        callback();
                    }
                }, config.image, diamondCount);
        } else {
            StoreHelper.getInstance().popupRewardDoubleDlg(diamondCount, BoostType.DIAMOND, rewardName, function () {
                if (callback) {
                    callback();
                }
            }.bind(this));
        }
        return;
    }
    splitCount = splitCount * param;
    threeBallCount = threeBallCount * param;
    if (double) {
        StoreHelper.getInstance().popupBoostRewardDlg(splitCount, threeBallCount, function () {
            callback && callback();
        });
    } else {
        if (splitCount > 0) {
            StoreHelper.getInstance().popupRewardDoubleDlg(splitCount, BoostType.SPLIT, rewardName, function () {
                callback && callback();
            }.bind(this));
        }
        if (threeBallCount > 0) {
            StoreHelper.getInstance().popupRewardDoubleDlg(threeBallCount, BoostType.THREE_BALL, rewardName, function () {
                callback && callback();
            }.bind(this));
        }
    }
};

DailyBonusController.prototype.claimClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (!this.claimed) {
        var self = this;
        this.popupClaimReward(this.curConfig, false, function () {
            self.setClaimed();
        });
    }
    this.close();
};

DailyBonusController.prototype.doubleClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (!this.claimed) {
        var self = this;
        StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "shuangbeilibao" : "dailybonus", function (rewarded) {
            if (rewarded) {
                this.popupClaimReward(this.curConfig, true, function () {
                    self.setClaimed();
                });
                this.close();
            }
        }.bind(this));
    }
};

DailyBonusController.prototype.setClaimed = function () {
    game.playerMan.setLastClaimDailyBonusDay(game.utils.getDayByTs(Date.now()));
    this.claimed = true;
};

DailyBonusController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

DailyBonusController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

DailyBonusController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

DailyBonusController.prototype.onExit = function () {
};

DailyBonusController.createFromCCB = function() {
    cc.BuilderReader.registerController("DailyBonusItemController", new DailyBonusItemController());
    //cc.BuilderReader.registerController("TitleController", new TitleController());
    var node = game.utils.loadNodeFromCCB("res/menu/daily_bonus_view.ccbi", null, "DailyBonusController", new DailyBonusController());
    cc.BuilderReader._controllerClassCache["DailyBonusItemController"] = undefined;
    return node;
};

module.exports = DailyBonusController;
},{"../config/ConfigMan":41,"../enum/BoostType":110,"../model/StoreHelper":129,"./DailyBonusItemController":58}],58:[function(require,module,exports){
var BoostType = require("../enum/BoostType");

var DailyBonusItemController = function () {
    BaseCCBController.call(this);

    this.spBlack = null;
    this.spItem = null;
    this.spCurrent = null;
    this.spClaimed = null;
    this.lblCount = null;
    this.lblDay = null;

    this.dailyBonusCfg = null;
};

game.utils.inherits(DailyBonusItemController, BaseCCBController);

DailyBonusItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};
/**
 * @param {DailyBonusConfig} data
 * @param {number} day
 * @param {boolean} current
 * @param {boolean} claimed
 */
//day, state, rewardObj, claimed
DailyBonusItemController.prototype.initWith = function (data, day, current, claimed) {
    this.dailyBonusCfg = data;

    if (data.type === BoostType.SKIN) {
        var getted = game.playerMan.hasSkin(data.arg1);
        if (getted) {
            data.type = data.extra.type;
            data.count = data.extra.count;
            data.image = data.extra.image;
        }
    }

    this.spBlack.visible = claimed;
    this.spItem.setSpriteFrame(data.image);
    //game.utils.scaleCCLabelBMFont(this.spItem, 59);
    if (!claimed) {
        this.spCurrent.visible = current;
    } else {
        this.spCurrent.visible = false;
    }

    this.spClaimed.visible = claimed;
    this.lblCount.setString("x" + data.count);
    this.lblDay.setString(game.utils.sprintf(_("day_title"), day));
};

DailyBonusItemController.prototype.getContentSize = function () {
    return this.spBgSelected.getContentSize();
};

DailyBonusItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/daily_bonus_item_view.ccbi", null, "DailyBonusItemController", new DailyBonusItemController());
};

module.exports = DailyBonusItemController;
},{"../enum/BoostType":110}],59:[function(require,module,exports){
var EventsName = require("../events/EventsName");
var NumberAnimation = require("../../common/entity/NumberAnimation");

var DiamondsController = function () {
    BaseCCBController.call(this);

    this.lbDiamonds = null;

    this.numberAnimation = null;
};

game.utils.inherits(DiamondsController, BaseCCBController);

DiamondsController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    game.eventDispatcher.addEventListener(EventsName.DIAMONDS_UPDATE, this.onUpdateDiamonds, this);
    cc.director.getScheduler().scheduleCallbackForTarget(this, this.onUpdate, 0.05, cc.REPEAT_FOREVER, 0, false);
};

DiamondsController.prototype.onExit = function () {
    this.numberAnimation.destroy();
    cc.director.getScheduler().unscheduleCallbackForTarget(this, this.onUpdate);
    game.eventDispatcher.removeEventListener(EventsName.DIAMONDS_UPDATE, this.onUpdateDiamonds, this);
    BaseCCBController.prototype.onExit.call(this);
};

DiamondsController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.numberAnimation = new NumberAnimation(this.lbDiamonds);
    this.lbDiamonds.setString(game.playerMan.getDiamonds());
};

DiamondsController.prototype.onUpdateDiamonds = function (event) {
    var data = event.getUserData();
    var diamonds = data.diamonds;
    var delta = data.delta;
    this.numberAnimation.playNumAnim(diamonds - delta, diamonds);
};

DiamondsController.prototype.diamondClicked = function (sender) {
    AudioHelper.playBtnSound();
    var StoreType = require("../enum/StoreType");
    game.popupMan.popupStoreDlg(StoreType.DIAMOND);
};

DiamondsController.prototype.onUpdate = function (dt) {
    this.numberAnimation.update(dt);
};

DiamondsController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/diamond_view.ccbi", null, "DiamondsController", new DiamondsController(), true);
    return node;
};

module.exports = DiamondsController;
},{"../../common/entity/NumberAnimation":6,"../enum/StoreType":120,"../events/EventsName":122}],60:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */
var GameMan = require("../model/GameMan");
var RemoveAdsController = require("./RemoveAdsController");

var FailController = function () {
    BaseCCBController.call(this);
    this._replayCallback = null;
    this._nextCallback = null;

    this.spFailCn = null;
    this.spFailEn = null;

    this.lblReward = null;
    //this.lblRelife = null;
    this.lblWheel = null;

    this.lblSkip = null;
    //this.ndSkipMask = null;
    //new
    this.lblSkipCostDiamonds = null;

    //this.btnSkip = null;
};

game.utils.inherits(FailController, BaseCCBController);

FailController.prototype.onExit = function () {
    this._replayCallback = null;
    game.eventDispatcher.removeEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.removeEventListener("dialog_closed", this.onDialogClosed, this);
    this.removeNativeAd();
};

FailController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.addEventListener("dialog_closed", this.onDialogClosed, this);
    if (game.adsManager.showTopBanner) {
        game.adsManager.removeBannerAds("top");
    }
};

FailController.prototype.onDialogPoped = function () {
    this.updateNativeAd();
};

FailController.prototype.onDialogClosed = function () {
    this.updateNativeAd();
};

FailController.prototype.updateNativeAd = function () {
    if (game.dialogManager.isTopestDialog(this.rootNode)) {
        this.showNativeAd();
    } else {
        this.removeNativeAd();
    }
};

FailController.prototype.showNativeAd = function () {
    game.adsManager.showNativeAd("fail", 0, 0);
};

FailController.prototype.removeNativeAd = function () {
    game.adsManager.removeNativeAd("fail");
};

FailController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lblWheel.setString(_("lucky_wheel_title"));
    this.lblReward.setString(_("watch_ads_get_boosts"));
    this.lblSkip.setString(_("skip_level_title"));
    //this.lblSkipCostDiamonds.setString("x" + game.config.skipDiamonds);
    game.audioPlayer.playEffectByKey("fail");

    if (!game.utils.isPad()) {
        this.rootNode.addChild(RemoveAdsController.createFromCCB());
    }

    //200 diamonds to skip.

    // if (game.gameMan.canSkip()) {
    //     cc.log("can skip");
    //     this.ndSkipMask.visible = false;
    //     this.btnSkip.enabled = true;
    // } else {
    //     cc.log("can not skip");
    //     this.ndSkipMask.visible = true;
    //     this.btnSkip.enabled = false;
    // }
};

FailController.prototype.initWith = function (replayCallback, skipCallback) {
    this._replayCallback = replayCallback;
    this._skipCallback = skipCallback;
};

FailController.prototype.onAnimEnd = function () {
    if (!GameMan.getInstance().tryShowFailPopup()) {
        game.adsHelper.showPassAds();
    }
};

FailController.prototype.restartClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.adsHelper.showPassAds();
    if (this._replayCallback) {
        this._replayCallback();
    }
    this.close();
};

FailController.prototype.homeClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.adsHelper.showBackHomeAds();
    game.sceneMan.switchScene(game.sceneType.MENU);
};

FailController.prototype.watchAdsClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "failgift" : "jili06", null, "FailAndWatchDiamondsAds");
};

FailController.prototype.relifeClicked = function (sender) {
    //game.audioPlayer.playEffectByKey("enter");
    //var StoreHelper = require("../model/StoreHelper");
    //StoreHelper.getInstance().checkAndShowRewardVideo(function () {
    //});
};

FailController.prototype.skipClicked = function (sender) {
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "tiaoguo01" : "skip", function (rewarded) {
        if (rewarded) {
            game.analyseManager.trackEvent("WatchAdsToSkipLevel", {"level": GameMan.getInstance().levelId});
            if (this._skipCallback) {
                this._skipCallback();
            }
        }
    }.bind(this));
};

FailController.prototype.wheelClicked = function (sender) {
    AudioHelper.playBtnSound();
    var WheelType = require("../enum/WheelType");
    game.popupMan.popupWheelDlg(WheelType.DailyBonus);
};

FailController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

FailController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

FailController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/fail_view.ccbi", null, "FailController", new FailController());
    return node;
};

module.exports = FailController;
},{"../enum/WheelType":121,"../model/GameMan":124,"../model/StoreHelper":129,"./RemoveAdsController":77}],61:[function(require,module,exports){
var EventsName = require("../events/EventsName");
var BricksView = require("../view/BricksView");
var GameMan = require("../model/GameMan");
var BoostType = require("../enum/BoostType");
var HelpController = require("./HelpController");
var StoreType = require("../enum/StoreType");
var AimItemController = require("./AimItemController");
var AimHelpController = require("./AimHelpController");
var StoreHelper = require("../model/StoreHelper");
var GiftBoxController = require("../controller/GiftBoxController");

var GameController = function () {
    BaseCCBController.call(this);
    this.LIFE_START_TAG = 100;
    this.LIFE_COUNT = 6;

    this.ndLifeNode = null;
    this.lbTime = null;
    this._gameNode = null;
    this.ndHelp = null;
    this.ndAimHelp = null;

    this.ndBoost1 = null;
    this.ndBoost2 = null;

    this.ndLifeNodes = null;

    this.spTopProgress = null;

    this.spYellow1 = null;
    this.spYellow2 = null;
    this.spYellow3 = null;

    this.spBlack1 = null;
    this.spBlack2 = null;
    this.spBlack3 = null;

    this.lbLevel = null;

    this.ndAnimItem = null;

    this.ndTopContainer = null;
    this.ndTopBg = null;

    this.ndLeft = null;
    this.ndRight = null;

    this.ndSkip = null;

    this.lb3New = null;
    this.lb3Multiple = null;

    this.ndDiamondNew = null;
    this.ndDiamondMultiple = null;

    this.lbDiamondNew = null;
    this.lbDiamondMulti = null;

    this.ndGift = null;

    this.spYellows = [];
    this.spBlacks = [];

    this.showedSkipAnim = false;
    this.config = null;
};

game.utils.inherits(GameController, BaseCCBController);

GameController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener(EventsName.UPDATE_LEVEL, this.onUpdateLevel, this);
    game.eventDispatcher.addEventListener(EventsName.REFRESH_BOOST, this.onUpdateBoost, this);
    game.eventDispatcher.addEventListener(EventsName.UPDATE_AIM_ITEM, this.onUpdateAimItem, this);
};

GameController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.REFRESH_BOOST, this.onUpdateBoost, this);
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_LEVEL, this.onUpdateLevel, this);
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_AIM_ITEM, this.onUpdateAimItem, this);
    this._gameCoreNode = null;
};

GameController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this.ndLifeNodes = [];
    for (var i = 0; i < this.LIFE_COUNT; ++i) {
        var lifeNode = this.ndLifeNode.getChildByTag(this.LIFE_START_TAG + i);
        this.ndLifeNodes.push(lifeNode);
    }

    this.spYellows = [this.spYellow1, this.spYellow2, this.spYellow3];
    this.spBlacks = [this.spBlack1, this.spBlack2, this.spBlack3];

    var config = null;
    var levelId = null;
    if (window.isEditor) {
        config = game.gameMan.levelCfg;
        levelId = 0;
    } else {
        config = GameMan.getInstance().getCurConfig();
        levelId = GameMan.getInstance().levelId;
    }
    this.config = config;

    this._gameCoreNode = new BricksView(config, this);
    this._gameNode.addChild(this._gameCoreNode);

    this.lbLevel.setString(game.utils.sprintf(_("level_title"), levelId));

    this.updateLifeCount();
    this.updateBoost();

    var firstEnter = game.storageController.getItem("first_enter", "true");
    if (firstEnter === "true") {
        this.ndHelp.visible = true;
    } else {
        this.ndHelp.visible = false;
    }

    this.updateTime();

    if (game.utils.isIOSNotchScreen()) {
        this.ndTopContainer.height += 70;
        this.ndTopBg.height += 70;
    }
    if (window.isEditor) {
        var xOffset = cc.winSize.width - 640;
        this.ndLeft.width = this.ndLeft.width + xOffset * 0.5;
        this.ndRight.width = this.ndRight.width + xOffset * 0.5;
    }
    this.lbDiamondMulti.setString("20");
    this.lbDiamondNew.setString("20");
    this.onUpdateAimItem();
    this.ndAimHelp.visible = false;

    this.ndSkip.visible = false;

    var self = this;
    var giftBox = GiftBoxController.createFromCCB();
    giftBox.controller.setCallback(function (state) {
        if (state === "start") {
            self._gameCoreNode.stop();
        } else {
            self._gameCoreNode.resume();
        }
    });
    this.ndGift.addChild(giftBox);
};

GameController.prototype.showSkipBtnAnim = function () {
    if (this.showedSkipAnim) {
        return;
    }
    this.showedSkipAnim = true;
    this.ndSkip.visible = true;
    var time = 0.5;
    this.ndSkip.runAction(cc.sequence( cc.scaleTo(time, 1.2), cc.scaleTo(time, 1),
        cc.scaleTo(time, 0.8), cc.scaleTo(time, 1)).repeatForever());
};

GameController.prototype.showAimHelp = function () {
    this.ndAimHelp.visible = true;
};

GameController.prototype.onUpdateAimItem = function () {
    if (game.gameMan.canTryAimItem()) {
        this.ndAnimItem.visible = true;
        cc.log("game controller can use aim item");
    } else {
        this.ndAnimItem.visible = false;
        cc.log("game controller not use aim item");
    }
};

GameController.prototype.updateLifeCount = function () {
    var nowLifeCount = this._gameCoreNode.lifeCount;
    for (var i = 0; i < this.LIFE_COUNT; ++i) {
        var lifeNode = this.ndLifeNodes[i];
        if (lifeNode) {
            lifeNode.visible = (nowLifeCount > i);
        }
    }
};

GameController.prototype.onUpdateBoost = function () {
    this.updateBoost();
};

GameController.prototype.updateBoost = function () {
    var threeBallBoostCount = game.playerMan.getBoostCount(BoostType.THREE_BALL);
    var splitBallBoostCount = game.playerMan.getBoostCount(BoostType.SPLIT);
    this.lb3New.setString("x" + threeBallBoostCount);
    this.lb3Multiple.setString("x" + splitBallBoostCount);

    this.lb3New.visible = false;
    this.lb3Multiple.visible = false;

    this.ndDiamondMultiple.visible = false;
    this.ndDiamondNew.visible = false;
    if (threeBallBoostCount > 0) {
        this.lb3New.visible = true;
    } else {
        this.ndDiamondNew.visible = true;
    }

    if (splitBallBoostCount > 0) {
        this.lb3Multiple.visible = true;
    } else {
        this.ndDiamondMultiple.visible = true;
    }

};

GameController.prototype.updateTime = function () {
    var costTime = 0;
    if (this._gameCoreNode.eclipsedTime) {
        costTime = this._gameCoreNode.eclipsedTime / 1000;
    }
    this.lbTime.setString(game.utils.getLongFormatTime(costTime));

    var percent = GameMan.getInstance().getProgressPercent(costTime);
    this.spTopProgress.setPreferredSize(cc.size(150 * percent * 0.01, 8));
    var star = GameMan.getInstance().getCurrentStar(costTime);
    this.updateStar(star);

    if (costTime >= this.config.starTime * 1.5) {
        this.showSkipBtnAnim();
    }
};

GameController.prototype.updateStar = function (star) {
    for (var i = 0; i < 3; ++i) {
        this.spYellows[i].visible = (star >= i + 1);
        this.spBlacks[i].visible = (star < i + 1);
    }
};

GameController.prototype.pauseClicked = function () {
    AudioHelper.playBtnSound();
    if (window.isEditor) {
        var EditorScene = require("../editor/scene/EditorScene");
        cc.director.runScene(new EditorScene());
    } else {
        this.showPause();
    }
};

GameController.prototype.showPause = function () {
    this._gameCoreNode.stop();
    var self = this;
    game.popupMan.popupPauseDlg(function () {
        self._gameCoreNode.resume();
    });
};

//GameController.prototype.storeClicked = function () {
//    AudioHelper.playBtnSound();
//    this._gameCoreNode.stop();
//    var self = this;
//    game.popupMan.popupStoreDlg(StoreType.DIAMOND, function () {
//        self._gameCoreNode.resume();
//    });
//};

GameController.prototype.new3Clicked = function () {
    AudioHelper.playBtnSound();
    if (game.playerMan.useBoost(BoostType.THREE_BALL) ||
        (StoreHelper.getInstance().buyOneBoost() && game.playerMan.useBoost(BoostType.THREE_BALL))) {
        this._gameCoreNode.useNew3BallBoost();
        this.updateBoost();
    } else {
        this._gameCoreNode.stop();
        var self = this;
        game.popupMan.popupStoreDlg(StoreType.DIAMOND, function () {
            self._gameCoreNode.resume();
        });
    }
};

GameController.prototype.multiple3Clicked = function () {
    AudioHelper.playBtnSound();
    if (game.playerMan.useBoost(BoostType.SPLIT) ||
        (StoreHelper.getInstance().buyOneBoost() && game.playerMan.useBoost(BoostType.SPLIT))) {
        this._gameCoreNode.useSplitBallBoost();
        this.updateBoost();
    } else {
        this._gameCoreNode.stop();
        var self = this;
        game.popupMan.popupStoreDlg(StoreType.DIAMOND, function () {
            self._gameCoreNode.resume();
        });
    }
};

GameController.prototype.storeClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.analyseManager.trackEvent("ClickStoreInGame");
    this._gameCoreNode.stop();
    var self = this;
    game.popupMan.popupStoreDlg(StoreType.DIAMOND, function () {
        self._gameCoreNode.resume();
    });
};

GameController.prototype.skinClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.analyseManager.trackEvent("ClickSkinsInGame");
    this._gameCoreNode.stop();
    var self = this;
    game.popupMan.popupStoreDlg(StoreType.SKIN, function () {
        self._gameCoreNode.resume();
    });
};

GameController.prototype.skipClicked = function (sender) {
    this._gameCoreNode.stop();
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo("skip_game", function (rewarded) {
        if (rewarded) {
            game.analyseManager.trackEvent("WatchAdsToSkipLevelGame", {"level": GameMan.getInstance().levelId});
            GameMan.getInstance().skipLevel();
            game.sceneMan.switchScene(game.sceneType.GAME);
        } else {
            this._gameCoreNode.resume();
        }
    }.bind(this));
}

GameController.createFromCCB = function() {
    game.utils.registerController("HelpController", new HelpController());
    game.utils.registerController("AimHelpController", new AimHelpController());
    game.utils.registerController("AimItemController", new AimItemController());
    var node = game.utils.loadNodeFromCCB("res/game/game_view.ccbi", null, "GameController", new GameController());
    game.utils.unRegisterController("AimItemController");
    game.utils.unRegisterController("HelpController");
    game.utils.unRegisterController("AimHelpController");
    return node;
};

module.exports = GameController;
},{"../controller/GiftBoxController":64,"../editor/scene/EditorScene":100,"../enum/BoostType":110,"../enum/StoreType":120,"../events/EventsName":122,"../model/GameMan":124,"../model/StoreHelper":129,"../view/BricksView":135,"./AimHelpController":51,"./AimItemController":52,"./HelpController":65}],62:[function(require,module,exports){
var GameMan = require("../model/GameMan");
var GameMode = require("../enum/GameMode");

var GameOverController = function () {
    BaseCCBController.call(this);
    this._bestScoreLabel = null;
    this._scoreLabel = null;

    this._iconEnglish = null;
    this._iconChinese = null;
    this._newRecordLabel = null;

    this._replayCallback = null;
};

game.utils.inherits(GameOverController, BaseCCBController);

GameOverController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this._newRecordLabel.visible = false;
};

GameOverController.prototype.initWith = function (percent, callback) {
    if (GameMan.getInstance().gameMode === GameMode.GAME_MODE_ENDLESS) {
        this._bestScoreLabel.setString(game.utils.sprintf(game.local.getValue("best_score_title"), game.playerMan.getBestScore()));
        this._scoreLabel.setString(percent);
        this._newRecordLabel.setString(game.local.getValue("new_record_title"));
        if (GameMan.getInstance().isNewRecord) {
            this._newRecordLabel.visible = true;
            this._newRecordLabel.runAction(cc.sequence(cc.fadeOut(0.3), cc.fadeIn(0.3)).repeatForever());
        }
    } else {
        this._bestScoreLabel.setString(game.utils.sprintf(game.local.getValue("level_title"), GameMan.getInstance().levelConfig.id));
        this._scoreLabel.setString(game.utils.sprintf("%d%%", percent));
    }
    this._replayCallback = callback;
};

GameOverController.prototype.homeClicked = function (sender) {
    AudioHelper.playBtnSound();
    var reScene = new cc.TransitionFade(0.5, GameBridge.getMenuScene(), cc.color(255, 255, 255));
    cc.director.runScene(reScene);
};

GameOverController.prototype.replayClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._replayCallback) {
        this._replayCallback();
    }
    this.close();
};

GameOverController.prototype.rankClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.gcManager.showLeaderboard(game.config.getLeaderBoardKey());
};

GameOverController.prototype.shareClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.shareWithSystem(game.utils.sprintf(game.local.getValue("share_tips"),
        game.playerMan.getBestScore(), game.config.getPlatformDownloadUrl()));
};

GameOverController.prototype.popup = function () {
    //game.dialogManager.popup(this.rootNode);
    //game.dialogManager.popup(this.rootNode, {"overlayOpacity": 100});
    game.dialogManager.popup(this.rootNode, {"overlayColor": cc.color(243, 243, 243), "overlayOpacity": 210});
};

GameOverController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

GameOverController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/game_over_view.ccbi", null, "GameOverController", new GameOverController());
    return node;
};

module.exports = GameOverController;
},{"../enum/GameMode":111,"../model/GameMan":124}],63:[function(require,module,exports){
var GameMan = require("../model/GameMan");

var GameWinController = function () {
    BaseCCBController.call(this);
    this.YELLOW_COLOR = cc.color(254, 175, 25);

    this._nextNode = null;

    this._resultLabel = null;

    this._replayCallback = null;
    this._nextCallback = null;
};

game.utils.inherits(GameWinController, BaseCCBController);

GameWinController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this._resultLabel.setString(game.local.getValue("mission_completed_title"));
    var hasNextLevel = GameMan.getInstance().hasNextLevel();
    if (!hasNextLevel) {
        this._nextNode.visible = false;
    }
};

GameWinController.prototype.initWith = function (callback, nextCallback) {
    this._replayCallback = callback;
    this._nextCallback = nextCallback;
};

GameWinController.prototype.homeClicked = function (sender) {
    AudioHelper.playBtnSound();
    var reScene = new cc.TransitionFade(0.5, GameBridge.getMenuScene(), cc.color(255, 255, 255));
    cc.director.runScene(reScene);
};

GameWinController.prototype.nextClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._nextCallback) {
        this._nextCallback();
    }
    this.close();
};

GameWinController.prototype.replayClicked = function (sender) {
    if (this._replayCallback) {
        this._replayCallback();
    }
    this.close();
};

GameWinController.prototype.rankClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.gcManager.showLeaderboard(game.config.getLeaderBoardKey());
};

GameWinController.prototype.shareClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.shareWithSystem(game.utils.sprintf(game.local.getValue("share_tips"),
        game.playerMan.getBestScore(), game.config.getPlatformDownloadUrl()));
};

GameWinController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {"overlayColor": cc.color(243, 243, 243), "overlayOpacity": 210});
};

GameWinController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

GameWinController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/game_win_view.ccbi", null, "GameWinController", new GameWinController());
    return node;
};

module.exports = GameWinController;
},{"../model/GameMan":124}],64:[function(require,module,exports){
var GiftBoxController = function () {
    BaseCCBController.call(this);
    this.callback = null;
};

game.utils.inherits(GiftBoxController, BaseCCBController);

GiftBoxController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
};

GiftBoxController.prototype.onExit = function () {
    BaseCCBController.prototype.onExit.call(this);
    clearTimeout(this.timeoutKey);
};

GiftBoxController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.rootNode.visible = false;
    this.timeoutKey = setTimeout(this.onTimeout.bind(this), 5000);
};

GiftBoxController.prototype.setCallback = function (callback) {
    this.callback = callback;
};

GiftBoxController.prototype.onTimeout = function () {
    if (game.gameMan.canShowGiftBox()) {
        this.rootNode.visible = true;
        game.gameMan.addGiftCount();
    } else {
        this.rootNode.visible = false;
    }
};

GiftBoxController.prototype.giftClicked = function () {
    AudioHelper.playBtnSound();
    var self = this;
    if (game.adsManager.isRewardVideoReady()) {
        this.rootNode.visible = false;
        if (self.callback) {
            self.callback("start");
        }
        var StoreHelper = require("../model/StoreHelper");
        StoreHelper.getInstance().checkAndShowRewardVideo("gift_box", function (watched) {
            if (watched) {
                game.gameMan.onGiftBoxOpened(function () {
                    if (self.callback) {
                        self.callback("end");
                    }
                });
            } else {
                if (self.callback) {
                    self.callback("end");
                }
            }
        });
    }
};

GiftBoxController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/gift_box_view.ccbi", null, "GiftBoxController", new GiftBoxController(), true);
    return node;
};

module.exports = GiftBoxController;
},{"../model/StoreHelper":129}],65:[function(require,module,exports){


var HelpController = function () {
    BaseCCBController.call(this);
    this.lbHelpInfo = null;
};

game.utils.inherits(HelpController, BaseCCBController);

HelpController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbHelpInfo.setString(game.local.getValue("help_content"));
    this.lbHelpInfo.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
};

module.exports = HelpController;
},{}],66:[function(require,module,exports){
var GameScene = require("../scene/GameScene");
var StoreHelper = require("../model/StoreHelper");
var MultiColTableView = require("../../common/ext/MultiColTableView");
var LevelItemController = require("./LevelItemController");
var LevelConfigMan = require("../config/ConfigMan");
var LockStatus = require("../enum/LockStatus");
var GameMan = require("../model/GameMan");
var TitleController = require("./TitleController");

var GRID_SIZE = [137.5, 120];

var LevelItemCellView = cc.TableViewCell.extend({
    levelEntity: null,
    levelItemNode: null,
    ctor: function () {
        this._super();
        this.levelItemNode = LevelItemController.createFromCCB();
        this.addChild(this.levelItemNode);

        this.levelItemNode.setPosition(cc.p(GRID_SIZE[0] * 0.5, GRID_SIZE[1] * 0.5));
    },

    initWith: function (levelEntity, idx) {
        this.levelEntity = levelEntity;
        this.levelItemNode.controller.initWith(levelEntity, idx);
    },

    showAppearAnim: function () {
        this.levelItemNode.controller.showAppearAnim();
    },

    showDisappearAnim: function () {
        this.levelItemNode.controller.showDisappearAnim();
    }
});

var LevelController = function () {
    BaseCCBController.call(this);
    this.ndContainer = null;
    this.lbLevelName = null;

    //user data.
    this._levelList = null;
};

game.utils.inherits(LevelController, BaseCCBController);

LevelController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this._levelList = GameMan.getInstance().getLevelList();
    this.showLevelTableView();

    var userLevel = GameMan.getInstance().getPlayerLevel();
    if (userLevel > this._levelList.length) {
        userLevel = this._levelList.length;
    }
    var curRow = 0;
    if (userLevel % this.numberOfGridsInCell() === 0) {
        curRow = Math.floor(userLevel / this.numberOfGridsInCell());
    } else {
        curRow = Math.floor(userLevel / this.numberOfGridsInCell()) + 1;
    }

    var yOffset = -(this.numberOfCellsInTableView() - curRow + 1) * this.gridSizeForTable().height +
        this._tableView.getViewSize().height;

    if (yOffset < this._tableView.minContainerOffset().y) {
        yOffset = this._tableView.minContainerOffset().y;
    } else if (yOffset >= this._tableView.maxContainerOffset().y) {
        yOffset = this._tableView.maxContainerOffset().y;
    }

    this._tableView.setContentOffset(cc.p(0, yOffset));
};

LevelController.prototype.showLevelTableView = function () {
    var size = this.ndContainer.getContentSize();
    this._tableView = new MultiColTableView(this, size, null);
    this._tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    this._tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    this._tableView.setMultiTableViewDelegate(this);
    this._tableView.ignoreAnchorPointForPosition(false);
    this._tableView.setAnchorPoint(cc.p(0, 0));
    this.ndContainer.addChild(this._tableView);
    this._tableView.reloadData();
};

LevelController.prototype.scrollViewDidScroll = function (view) {
};

LevelController.prototype.scrollViewDidZoom = function (view) {
};

LevelController.prototype.gridAtIndex = function(multiTable,  idx) {
    var cell = multiTable.dequeueGrid();
    if (!cell) {
        cell = new LevelItemCellView();
    }

    if (idx < this._levelList.length) {
        var levelEntity = this._levelList[idx];
        cell.initWith(levelEntity, idx);
        cell.visible = true;
    } else {
        cell.visible = false;
    }

    return cell;
};

LevelController.prototype.numberOfCellsInTableView = function(multiTable) {
    var gridsInCell = this.numberOfGridsInCell(multiTable);
    if (this._levelList.length % gridsInCell === 0) {
        return Math.floor(this._levelList.length / gridsInCell);
    } else {
        return Math.floor(this._levelList.length / gridsInCell) + 1;
    }
};

LevelController.prototype.numberOfGridsInCell = function(multiTable, colIdx) {
    return 4;
};

LevelController.prototype.gridSizeForTable = function(table, colIdx) {
    return cc.size(GRID_SIZE[0], GRID_SIZE[1]);
};

LevelController.prototype.gridTouched = function(table, grid) {
    //console.log("grid touched at index: " + grid.getIdx());
    AudioHelper.playBtnSound();
    if (grid.getIdx() < GameMan.getInstance().getPlayerLevel()) {
        if (this.clicked) {
            return;
        }
        this.clicked = true;
        GameMan.getInstance().chooseLevel(grid.getIdx() + 1);
        game.sceneMan.switchScene(game.sceneType.GAME);
    }
};

LevelController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.sceneMan.switchScene(game.sceneType.MENU);
};

LevelController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/level_view.ccbi", null, "LevelController", new LevelController());
    return node;
};

module.exports = LevelController;
},{"../../common/ext/MultiColTableView":13,"../config/ConfigMan":41,"../enum/LockStatus":114,"../model/GameMan":124,"../model/StoreHelper":129,"../scene/GameScene":130,"./LevelItemController":67,"./TitleController":91}],67:[function(require,module,exports){
var LockStatus = require("../enum/LockStatus");
var GameMan = require("../model/GameMan");

var LevelItemController = function () {
    BaseCCBController.call(this);

    this.GRAY_COLOR = cc.color(78, 100, 169);
    this.LIGHT_COLOR = cc.color(251, 252, 255);

    this.lbLevel = null;
    this.spPlayed = null;
    this.spLocked = null;

    this.spCurrent = null;

    this.ndStar = null;

    this.spYellow1 = null;
    this.spYellow2 = null;
    this.spYellow3 = null;

    this.spBlack1 = null;
    this.spBlack2 = null;
    this.spBlack3 = null;

    this.spYellows = [];
    this.spBlacks = [];

    this.idx = 0;
};

game.utils.inherits(LevelItemController, BaseCCBController);

LevelItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.spYellows = [this.spYellow1, this.spYellow2, this.spYellow3];
    this.spBlacks = [this.spBlack1, this.spBlack2, this.spBlack3];
};

LevelItemController.prototype.showAppearAnim = function () {
    game.utils.randomScaleAnim(this.rootNode, 1, 0.8);
};

LevelItemController.prototype.showDisappearAnim = function () {
    this.rootNode.runAction(cc.scaleTo(0.4, 0));
};

/**
 * @param {LevelConfig} data
 * @param {number} idx
 */
LevelItemController.prototype.initWith = function (data, idx) {
    cc.log("LevelItemController initWith");
    this.idx = idx;
    this.lbLevel.setString(idx + 1);
    var level = idx + 1;

    this.spCurrent.visible = false;
    this.spLocked.visible = false;
    this.spPlayed.visible = false;
    this.ndStar.visible = false;
    this.lbLevel.visible = true;
    var curLevel = GameMan.getInstance().getPlayerLevel();
    if (curLevel === idx + 1) {
        this.spCurrent.visible = true;
        this.lbLevel.y = 0;
        this.lbLevel.setColor(this.LIGHT_COLOR);
    } else if (curLevel > idx + 1) {
        this.spPlayed.visible = true;
        this.ndStar.visible = true;
        var star = 0;
        if (GameMan.getInstance().isHardMode()) {
            star = game.playerMan.getHardLevelStar(level) || 0;
        } else {
            star = game.playerMan.getLevelStar(level) || 0;
        }
        cc.log("LevelItemController star:" + star);
        for (var i = 0; i < 3; ++i) {
            this.spYellows[i].visible = (star >= i + 1);
            this.spBlacks[i].visible = (star < i + 1);
        }
        this.lbLevel.y = 11;
        this.lbLevel.setColor(this.LIGHT_COLOR);
    } else {
        this.lbLevel.y = 0;
        //this.lbLevel.visible = false;
        this.spLocked.visible = true;
        this.lbLevel.setColor(this.GRAY_COLOR);
    }
};

LevelItemController.prototype.levelClicked = function () {
    AudioHelper.playBtnSound();
    if (this.idx < GameMan.getInstance().getPlayerLevel()) {
        GameMan.getInstance().chooseLevel(this.idx + 1);
        game.sceneMan.switchScene(game.sceneType.GAME);
    }
};

LevelItemController.prototype.getContentSize = function () {
    return this.spPlayed.getContentSize();
};

LevelItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/level_item_view.ccbi", null, "LevelItemController", new LevelItemController());
};

module.exports = LevelItemController;
},{"../enum/LockStatus":114,"../model/GameMan":124}],68:[function(require,module,exports){
var MenuScene = require("../scene/MenuScene");
var PlayerMan = require("../model/PlayerMan");
var StoreHelper = require("../model/StoreHelper");
var GameScene = require("../scene/GameScene");
var SceneType = require("../enum/SceneType");
var GameMan = require("../model/GameMan");
var SceneMan = require("../model/SceneMan");
var AdsReminderController = require("../controller/AdsReminderController");
var DiamondsController = require("../controller/DiamondsController");

var LoadingController = function () {
    BaseCCBController.call(this);
    this.bgEnSprite = null;
    this.bgCnSprite = null;
};

game.utils.inherits(LoadingController, BaseCCBController);

LoadingController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);

    cc.BuilderReader.registerController("AdsReminderController", new AdsReminderController());
    cc.BuilderReader.registerController("DiamondsController", new DiamondsController());

    game.playerMan = PlayerMan.getInstance();
    game.playerMan.initData();

    var LogicMan = require("../../common/model/LogicMan");
    LogicMan.getInstance().startGame(true);

    var ResourcesMan = require("../model/ResourcesMan");

    game.sceneMan = SceneMan.getInstance();
    game.sceneType = SceneType;

    game.gameMan.init();
    game.gameMan.checkRemoteConfig();
    //game.gameMan.adjustSkinConfigs();

    game.analyseManager.trackEvent("Loading");
    var isFirstEnterGame = true;
    var firstOpenGame = game.storageController.getItem("firstOpenGame", "true");
    if (firstOpenGame != "true") {
        isFirstEnterGame = false;
    } else {
        game.storageController.setItem("firstOpenGame", "false");
    }

    var myLogo = game.utils.isSelfGame();

    cc.log("isFirstEnterGame:" + isFirstEnterGame);

    this.bgCnSprite.visible = false;
    this.bgEnSprite.visible = false;
    var sprite = myLogo ? this.bgCnSprite : this.bgEnSprite;
    sprite.visible = true;
    sprite.opacity = 0;
    var WAIT_TIME = 2000;
    sprite.runAction(cc.sequence(cc.fadeIn(0.5), cc.callFunc(function () {
        var time = Date.now();
        ResourcesMan.getInstance().preload(function () {
            var loadTime = Date.now() - time;
            cc.log("loadTime:" + loadTime);
            var delayTime = Math.max(WAIT_TIME - loadTime, 200);
            sprite.runAction(cc.sequence(cc.delayTime(delayTime / 1000), cc.fadeOut(0.5), cc.callFunc(function () {
                if (isFirstEnterGame) {
                    GameMan.getInstance().chooseLatestLevel();
                    game.sceneMan.switchScene(game.sceneType.GAME);
                    game.analyseManager.trackEvent("EnterFirstLevel");
                } else {
                    cc.director.runScene(new MenuScene());
                }
            }, this)));
        });
    }, this)));
};

LoadingController.prototype.onExit = function () {
    BaseCCBController.prototype.onExit.call(this);
};

LoadingController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

LoadingController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/loading_view.ccbi", null, "LoadingController", new LoadingController());
    return node;
};

module.exports = LoadingController;
},{"../../common/model/LogicMan":27,"../controller/AdsReminderController":50,"../controller/DiamondsController":59,"../enum/SceneType":116,"../model/GameMan":124,"../model/PlayerMan":125,"../model/ResourcesMan":127,"../model/SceneMan":128,"../model/StoreHelper":129,"../scene/GameScene":130,"../scene/MenuScene":133}],69:[function(require,module,exports){
//var PackageScene = require("../scene/PackageScene");
//var StoreHelper = require("../model/StoreHelper");
//var LevelScene = require("../scene/LevelScene");
//var GameScene = require("../scene/GameScene");
var GameMan = require("../model/GameMan");
var StoreHelper = require("../model/StoreHelper");
var EventsName = require("../events/EventsName");

game.firstEnter = true;

var MenuController = function () {
    BaseCCBController.call(this);

    //this.spPlayEn = null;
    //this.spPlayCn = null;
    //this.spLevelsEn = null;
    //this.spLevelsCn = null;
    this.spIconEn = null;
    this.spIconCn = null;

    this._rankItem = null;
    this._supportItem = null;
    this._storeItem = null;
    this._rateItem = null;
    this._soundItem = null;

    //this.spHardCn = null;
    //this.spHardEn = null;

    this.spHardHint = null;

    //this.btnGiftEn = null;
    //this.btnGiftCn = null;
    //
    //this.btnWheelCn = null;
    //this.btnWheelEn = null;

    this.spGiftBg = null;
    this.ndSpecialOffer = null;

    this.ndGifts = null;

    this.spTaskReminder = null;
    this.spSkinReminder = null;

    this.lbStarCount = null;
};

game.utils.inherits(MenuController, BaseCCBController);

MenuController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    setTimeout(function () {
        var firstOpenGame = game.storageController.getItem("firstOpenGame", "true");
        if (firstOpenGame != "true") {
            GameMan.getInstance().checkAutoPopup(game.firstEnter);
        } else {
            game.storageController.setItem("firstOpenGame", "false");
        }
        game.firstEnter = false;
    }, 300);
    this.updateTaskReminder();
    //this.intervalKey = setInterval(this.onUpdate.bind(this), 1000);
    game.eventDispatcher.addEventListener(EventsName.UPDATE_SPECIAL_OFFER, this.updateSpeicialOffer, this);
    game.eventDispatcher.addEventListener(EventsName.TASK_UPDATE, this.updateTaskReminder, this);
};

MenuController.prototype.onExit = function () {
    clearInterval(this.intervalKey);
    game.eventDispatcher.removeEventListener(EventsName.TASK_UPDATE, this.updateTaskReminder, this);
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_SPECIAL_OFFER, this.updateSpeicialOffer, this);
};

MenuController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    game.analyseManager.trackEvent("EnterMenu");
    //this.createClubButton();
    this.updateSoundItem();
    this.updateGiftItem();
    //this.spPlayEn.visible = false;
    //this.spPlayCn.visible = false;
    //this.spLevelsEn.visible = false;
    //this.spLevelsCn.visible = false;
    this.spIconEn.visible = false;
    this.spIconCn.visible = false;
    //this.spHardCn.visible = false;
    //this.spHardEn.visible = false;
    //this.btnGiftEn.visible = false;
    //this.btnGiftCn.visible = false;
    //this.btnWheelCn.visible = false;
    //this.btnWheelEn.visible = false;

    if (game.local.isChinese()) {
        //this.spPlayCn.visible = true;
        //this.spLevelsCn.visible = true;
        this.spIconCn.visible = true;
        //this.spHardCn.visible = true;
        //this.btnGiftCn.visible = true;
        //this.btnWheelCn.visible = true;
    } else {
        //this.spPlayEn.visible = true;
        //this.spLevelsEn.visible = true;
        this.spIconEn.visible = true;
        //this.spHardEn.visible = true;
        //this.btnGiftEn.visible = true;
        //this.btnWheelEn.visible = true;
    }
    this.ndGifts.visible = true;

    this.spGiftBg.runAction(cc.rotateBy(3, 360).repeatForever());
    this.updateSpeicialOffer();
    this.updateSkinReminder();

    this.lbStarCount.setString(game.gameMan.getTotalStarCount());
};

MenuController.prototype.updateSpeicialOffer = function () {
    this.ndSpecialOffer.visible = !GameMan.getInstance().isSpecialOfferPurchased();
};

MenuController.prototype.onUpdate = function () {
    this.updateGiftItem();
};

MenuController.prototype.updateGiftItem = function () {
    if (game.adsManager.isRewardVideoReady()) {
        this.ndGifts.visible = true;
    } else {
        this.ndGifts.visible = false;
    }
};

MenuController.prototype.updateSoundItem = function () {
    var isSoundOn = game.audioPlayer.isEffectOn();
    if (isSoundOn) {
        this._soundItem.setNormalImage(new cc.Sprite("#btn_sound_on.png"));
        this._soundItem.setSelectedImage(new cc.Sprite("#btn_sound_on.png"));
    } else {
        this._soundItem.setNormalImage(new cc.Sprite("#btn_sound_off.png"));
        this._soundItem.setSelectedImage(new cc.Sprite("#btn_sound_off.png"));
    }
};

MenuController.prototype.storeClicked = function (sender) {
    AudioHelper.playBtnSound();
    var StoreType = require("../enum/StoreType");
    game.popupMan.popupStoreDlg(StoreType.DIAMOND);
};

MenuController.prototype.shareClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.shareWithSystem(game.utils.sprintf(game.local.getValue("share_tips"),
        game.playerMan.getLevel(), game.config.getPlatformDownloadUrl()));
};

MenuController.prototype.rankClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.gcManager.showLeaderboard(game.config.getLeaderBoardKey());
};

MenuController.prototype.supportClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.sendEmail(game.config.connectEmail,
        game.local.getValue("feed_back_title"), game.local.getValue("feed_back_content"));
};

MenuController.prototype.rateClicked = function (sender) {
    AudioHelper.playBtnSound();
    cc.sys.openURL(game.config.getPlatformDownloadUrl());
};

MenuController.prototype.playClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (GameMan.getInstance().chooseLatestLevel()) {
        if (this.played) {
            return;
        }
        this.played = true;
        game.sceneMan.switchScene(game.sceneType.GAME);
    } else {
        game.popupMan.popupCommonDlg(game.local.getValue("all_completed"));
    }
};

MenuController.prototype.packageClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this.played) {
        return;
    }
    this.played = true;
    GameMan.getInstance().setHardMode(false);
    game.sceneMan.switchScene(game.sceneType.LEVEL);
};

MenuController.prototype.soundClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.audioPlayer.setEffectOn(!game.audioPlayer.isEffectOn());
    game.audioPlayer.setMusicOn(!game.audioPlayer.isMusicOn());
    this.updateSoundItem();
};

MenuController.prototype.wheelClicked = function (sender) {
    AudioHelper.playBtnSound();
    var WheelType = require("../enum/WheelType");
    game.popupMan.popupWheelDlg(WheelType.DailyBonus);
};

MenuController.prototype.dailyBonusClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.popupMan.popupDailyBonus();
};

MenuController.prototype.hardClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this.played) {
        return;
    }
    this.played = true;
    game.storageController.setItem("hard_reminded", "false");
    this.spHardHint.visible = false;
    GameMan.getInstance().setHardMode(true);
    game.sceneMan.switchScene(game.sceneType.LEVEL);
};

MenuController.prototype.giftClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "shouye" : "jili04");
};

MenuController.prototype.taskClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.analyseManager.trackEvent("ClickTasks");
    game.popupMan.popupTaskDlg();

    game.storageController.setItem("click_task", "true");
    this.updateTaskReminder();
};

MenuController.prototype.updateTaskReminder = function () {
    var clickSkin = game.storageController.getItem("click_task", "false");
    if (clickSkin == "false") {
        this.spTaskReminder.visible = true;
    } else {
        if (GameMan.getInstance().hasCompletedTask()) {
            this.spTaskReminder.visible = true;
        } else {
            this.spTaskReminder.visible = false;
        }
    }
};

MenuController.prototype.updateSkinReminder = function () {
    var clickSkin = game.storageController.getItem("click_skin_new", "false");
    if (clickSkin == "false") {
        this.spSkinReminder.visible = true;
    } else {
        this.spSkinReminder.visible = false;
    }
};

MenuController.prototype.specialOfferClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.popupMan.popupSpeicialOffer();
};

MenuController.prototype.skinClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.analyseManager.trackEvent("ClickSkins");
    var StoreType = require("../enum/StoreType");
    game.popupMan.popupStoreDlg(StoreType.SKIN);
    game.storageController.setItem("click_skin_new", "true");
    this.updateSkinReminder();
};

MenuController.prototype.settingClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.popupMan.popupSettingDlg();
};

MenuController.prototype.removeAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    var StoreType = require("../enum/StoreType");
    var StoreHelper = require("../model/StoreHelper");
    var removeAdEntity = StoreHelper.getInstance().getStoreEntityByType(StoreType.REMOVE_ADS);
    StoreHelper.getInstance().buyProduct(removeAdEntity);
};

MenuController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/menu_view.ccbi", null, "MenuController", new MenuController());
    return node;
};

MenuController.time = 0;

module.exports = MenuController;
},{"../enum/StoreType":120,"../enum/WheelType":121,"../events/EventsName":122,"../model/GameMan":124,"../model/StoreHelper":129}],70:[function(require,module,exports){


var NoticeController = function () {
    BaseCCBController.call(this);
    this._okItem = null;
    this._cancelItem = null;
    this._confirmItem = null;
    this._closeItem = null;
    this._infoLabel = null;

    this._okLabel = null;
    this._cancelLabel = null;
    this._confirmLabel = null;

    this.ndReward1 = null;
    this.ndReward2 = null;

    this.spReward1 = null;
    this.lbReward1 = null;
    this.spReward2 = null;
    this.lbReward2 = null;
    this.lbReward2Info = null;

    this.spReward = null;
    this.lbReward = null;
    this.lbRewardInfo = null;

    this.sprAd = null;

    this._okCallFunc = null;
    this._failCallFunc = null;
};

game.utils.inherits(NoticeController, BaseCCBController);

NoticeController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    //game.adsManager.showNativeAd("notice", 0, 0);
};

NoticeController.prototype.onExit = function () {
    //game.adsManager.removeNativeAd("notice");
    BaseCCBController.prototype.onExit.call(this);
};

NoticeController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this._titleLabel.setString(game.local.getValue("notice_title"));
    this.ndReward1.visible = false;
    this.ndReward2.visible = false;
    this._infoLabel.visible = false;
    this.sprAd.visible = false;
};

NoticeController.prototype.initWithYes = function (info, okCallFunc) {
    this._infoLabel.visible = true;
    this._infoLabel.setString(info);
    this._infoLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
    this._okCallFunc = okCallFunc;
    this._confirmItem.visible = true;
    this._okItem.visible = false;
    this._cancelItem.visible = false;
    this._okLabel.visible = false;
    this._cancelLabel.visible = false;
    this._closeItem.visible = false;
    this._confirmLabel.visible = true;
    this._confirmLabel.setString(game.local.getValue("confirm_info"));
    this._confirmLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
};

NoticeController.prototype.initWithYesNo = function (info, yesInfo, cancelInfo, okCallFunc, failCallFunc, showClose, isShowAds) {
    this._infoLabel.visible = true;
    this._infoLabel.setString(info);
    this._infoLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
    this._okCallFunc = okCallFunc;
    this._failCallFunc = failCallFunc;
    if (this._confirmItem) {
        this._confirmItem.visible = false;
    }
    this._okItem.visible = true;
    this._cancelItem.visible = true;
    this._okLabel.visible = true;
    this._cancelLabel.visible = true;
    if (this._confirmLabel) {
        this._confirmLabel.visible = false;
    }
    this._okLabel.setString(yesInfo);
    this._cancelLabel.setString(cancelInfo);
    this._okLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
    this._cancelLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
    this._closeItem.visible = showClose;
    this.sprAd.visible = !!isShowAds;
    if (isShowAds) {
        this.rootNode.scheduleOnce(function () {
            game.utils.playCCBAnimation(this.rootNode, "loop");
        }.bind(this), 1);
    }
};

NoticeController.prototype.initWithRewardYes = function (info, okCallFunc, reward1Sprite, reward1Count,
                                                      reward2Sprite, reward2Count) {
    this._infoLabel.visible = false;
    var spriteFrame;
    if (reward1Sprite && reward2Sprite) {
        this.ndReward2.visible = true;
        this.lbReward2Info.setString(info);
        this.lbReward2Info.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward1Sprite);
        if (spriteFrame) {
            this.spReward1.setSpriteFrame(spriteFrame);
        }
        this.lbReward1.setString("x" + reward1Count);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward2Sprite);
        if (spriteFrame) {
            this.spReward2.setSpriteFrame(spriteFrame);
        }
        this.lbReward2.setString("x" + reward2Count);
    } else {
        this.ndReward1.visible = true;
        this.lbRewardInfo.setString(info);
        this.lbRewardInfo.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward1Sprite);
        if (spriteFrame) {
            this.spReward.setSpriteFrame(spriteFrame);
        }
        this.lbReward.setString("x" + reward1Count);
    }

    this._okCallFunc = okCallFunc;
    this._confirmItem.visible = true;
    this._okItem.visible = false;
    this._cancelItem.visible = false;
    this._okLabel.visible = false;
    this._cancelLabel.visible = false;
    this._closeItem.visible = false;
    this._confirmLabel.visible = true;
    this._confirmLabel.setString(game.local.getValue("confirm_info"));
    this._confirmLabel.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
};

NoticeController.prototype.okClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._okCallFunc) {
        this._okCallFunc();
    }
    this.close();
};

NoticeController.prototype.cancelClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._failCallFunc) {
        this._failCallFunc();
    }
    this.close();
};

NoticeController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

NoticeController.prototype.confirmClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._okCallFunc) {
        this._okCallFunc();
    }
    this.close();
};

NoticeController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

NoticeController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};


NoticeController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/notice_view.ccbi", null, "NoticeController", new NoticeController());
    return node;
};

NoticeController.createGuideFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/new_tip_view.ccbi", null, "NoticeController", new NoticeController());
    return node;
};

module.exports = NoticeController;
},{}],71:[function(require,module,exports){
var GameScene = require("../scene/GameScene");
var StoreHelper = require("../model/StoreHelper");
var MultiColTableView = require("../../common/ext/MultiColTableView");
var PackageItemController = require("./PackageItemController");
var LevelConfigMan = require("../config/ConfigMan");
var LockStatus = require("../enum/LockStatus");
var GameMan = require("../model/GameMan");
var LevelScene = require("../scene/LevelScene");
var TitleController = require("./TitleController");

//var CELL_WIDTH = 520;

var PackageItemCellView = cc.TableViewCell.extend({
    packageEntity: null,
    packageItemNode: null,

    ctor: function () {
        this._super();
        this.packageItemNode = PackageItemController.createFromCCB();
        this.addChild(this.packageItemNode);
        var size = this.packageItemNode.controller.getContentSize();
        this.packageItemNode.setPosition(cc.p(cc.winSize.width * 0.5, size.height * 0.5));
    },

    initWith: function (packageEntity, idx) {
        cc.log("PackageItemCellView initWith:idx:" + idx);
        this.packageEntity = packageEntity;
        this.packageItemNode.controller.initWith(packageEntity, idx);
    },

    refresh: function () {
        this.packageItemNode.controller.refresh();
    },

    showAppearAnim: function () {
        this.packageItemNode.controller.showAppearAnim(false);
    },

    showDisappearAnim: function () {
        this.packageItemNode.controller.showDisappearAnim();
    }
});

var PackageController = function () {
    BaseCCBController.call(this);
    this.lbChapterName = null;
    this.ndContainer = null;
    this.lbLevelName = null;
    this._tableView = null;

    //user data.
    this.packageConfigs = null;
};

game.utils.inherits(PackageController, BaseCCBController);

PackageController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this.packageConfigs = LevelConfigMan.getInstance().getPackageList();

    this.showLevelTableView();

    var packageId = 1;
    var packageInfo = GameMan.getInstance().getMinUnCompletedPackage();
    if (!packageInfo || (packageInfo.id > this.packageConfigs.length)) {
        packageId = 1;
    } else {
        packageId = packageInfo.id;
    }
    cc.log("packageId:" + packageId);
    var curRow = 0;
    if (packageId % this.numberOfGridsInCell() === 0) {
        curRow = Math.floor(packageId / this.numberOfGridsInCell());
    } else {
        curRow = Math.floor(packageId / this.numberOfGridsInCell()) + 1;
    }

    var yOffset = -(this.numberOfCellsInTableView() - curRow + 1) * this.gridSizeForTable().height +
        this._tableView.getViewSize().height;

    if (yOffset < this._tableView.minContainerOffset().y) {
        yOffset = this._tableView.minContainerOffset().y;
    } else if (yOffset >= this._tableView.maxContainerOffset().y) {
        yOffset = this._tableView.maxContainerOffset().y;
    }

    this._tableView.setContentOffset(cc.p(0, yOffset));

    for (var i = 0; i < this.numberOfCellsInTableView(); ++i) {
        var cell = this._tableView.getGridAtIndex(i);
        if (cell) {
            cell.showAppearAnim();
        }
    }

    this.lbLevelName.setString(game.local.getValue("package_title"));
};

PackageController.prototype.showLevelTableView = function () {
    this._tableView = new MultiColTableView(this, this.ndContainer.getContentSize(), null);
    this._tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    this._tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    this._tableView.setMultiTableViewDelegate(this);
    this._tableView.ignoreAnchorPointForPosition(false);
    this._tableView.setAnchorPoint(cc.p(0, 0));
    this.ndContainer.addChild(this._tableView);
    this._tableView.reloadData();
};

PackageController.prototype.scrollViewDidScroll = function (view) {
};

PackageController.prototype.scrollViewDidZoom = function (view) {
};

PackageController.prototype.gridAtIndex = function(multiTable,  idx) {
    var cell = multiTable.dequeueGrid();
    if (!cell) {
        cell = new PackageItemCellView();
    }

    if (idx < this.packageConfigs.length) {
        var packageConfig = this.packageConfigs[idx];
        cell.initWith(packageConfig, idx, this.inited);
        cell.visible = true;
    } else {
        cell.visible = false;
    }

    return cell;
};

PackageController.prototype.numberOfCellsInTableView = function(multiTable) {
    return this.packageConfigs.length;
};

PackageController.prototype.numberOfGridsInCell = function(multiTable, colIdx) {
    return 1;
};

PackageController.prototype.gridSizeForTable = function(table, colIdx) {
    return cc.size(cc.winSize.width, 143);
};

PackageController.prototype.gridTouched = function(table, grid) {
    cc.log("grid touched at index: " + grid.getIdx());
    var packageEntity = grid.packageEntity;
    AudioHelper.playBtnSound();
    if (packageEntity.isLocked()) {
        game.popupMan.popupYesNoCommonDlg(game.utils.sprintf(game.local.getValue("unlock_info"), packageEntity.unlockCount),
            game.local.getValue("unlock_title"),
            game.local.getValue("cancel_title"),
            function () {
            if (game.playerMan.player.coins >= packageEntity.unlockCount) {
                game.playerMan.addCoins(-packageEntity.unlockCount);
                game.playerMan.setPackageUnlocked(packageEntity.id);
                grid.refresh();
            } else {
                game.popupMan.popupStoreDlg();
            }
        });
    } else {
        this.showCloseAnim(function () {
            GameMan.getInstance().setPackageEntity(packageEntity);
            game.sceneMan.switchScene(game.sceneType.LEVEL);
        });
    }
};

PackageController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.showCloseAnim(function () {
        game.sceneMan.switchScene(game.sceneType.MENU);
    });
};

PackageController.prototype.showCloseAnim = function (callback) {
    for (var i = 0; i < this.numberOfCellsInTableView(); ++i) {
        var cell = this._tableView.getGridAtIndex(i);
        if (cell) {
            cell.showDisappearAnim();
        }
    }
    this.rootNode.scheduleOnce(function () {
        if (callback) {
            callback();
        }
    }.bind(this), 0.8);
};

PackageController.createFromCCB = function() {
    cc.BuilderReader.registerController("TitleController", new TitleController());
    var node = game.utils.loadNodeFromCCB("res/menu/package_view.ccbi", null, "PackageController", new PackageController());
    cc.BuilderReader._controllerClassCache["TitleController"] = undefined;
    return node;
};

module.exports = PackageController;
},{"../../common/ext/MultiColTableView":13,"../config/ConfigMan":41,"../enum/LockStatus":114,"../model/GameMan":124,"../model/StoreHelper":129,"../scene/GameScene":130,"../scene/LevelScene":131,"./PackageItemController":72,"./TitleController":91}],72:[function(require,module,exports){
var LockStatus = require("../enum/LockStatus");

var PackageItemController = function () {
    BaseCCBController.call(this);
    this.lbName = null;
    this.lbCount = null;

    this.spBg = null;

    this.spCompleted = null;
    this.spUnCompleted = null;

    this.ndLock = null;
    this.lbUnlockCount = null;

    this.packageEntity = null;

    this.idx = 0;
};

game.utils.inherits(PackageItemController, BaseCCBController);

PackageItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

PackageItemController.prototype.showAppearAnim = function (inited) {
    //if (!inited) {
        this.rootNode.stopAllActions();
        game.utils.playCCBAnimation(this.rootNode, "left");
        this.rootNode.scheduleOnce(function () {
            game.utils.playCCBAnimation(this.rootNode, "normal");
        }.bind(this), this.idx * 0.05);
    //} else {
    //    game.utils.playCCBAnimation(this.rootNode, "none");
    //}
};

PackageItemController.prototype.showDisappearAnim = function () {
    this.rootNode.stopAllActions();
    this.rootNode.scheduleOnce(function () {
        game.utils.playCCBAnimation(this.rootNode, "disappear");
    }.bind(this), this.idx * 0.05);
};

/**
 * @param {PackageConfig} data
 * @param {number} idx
 */
PackageItemController.prototype.initWith = function (data, idx) {
    this.packageEntity = data;
    this.idx = idx;
    this.refresh();
    game.utils.playCCBAnimation(this.rootNode, "none");
};

PackageItemController.prototype.refresh = function () {
    this.lbName.setString(game.local.getValue(game.utils.sprintf("package_%d", this.idx + 1)));
    var maxLevel = game.playerMan.getPackageUnlockLevel(this.packageEntity.id) + 1;
    if (maxLevel > this.packageEntity.count) {
        maxLevel = this.packageEntity.count;
    }
    this.lbCount.setString(maxLevel + "/" + this.packageEntity.count);
    this.spBg.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(this.packageEntity.image));
    this.spCompleted.visible = false;
    this.spUnCompleted.visible = false;
    if (maxLevel === this.packageEntity.count) {
        this.spCompleted.visible = true;
    } else {
        this.spUnCompleted.visible = true;
    }
    if (this.packageEntity.isLocked()) {
        this.ndLock.visible = true;
        this.lbUnlockCount.setString(this.packageEntity.unlockCount);
    } else {
        this.ndLock.visible = false;
    }

    if (!game.local.isChinese()) {
        this.lbName.setScale(1.0);
    }
};

PackageItemController.prototype.getContentSize = function () {
    return this.spBg.getContentSize();
};

PackageItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/package_item_view.ccbi", null, "PackageItemController", new PackageItemController());
};

module.exports = PackageItemController;
},{"../enum/LockStatus":114}],73:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */
var GameMan = require("../model/GameMan");
var EventsName = require("../events/EventsName");
var RemoveAdsController = require("./RemoveAdsController");

var PassController = function () {
    BaseCCBController.call(this);
    this._replayCallback = null;
    this._nextCallback = null;

    //this.spWinCn = null;
    //this.spWinEn = null;

    this.ndWheel = null;
    this.ndClaimDiamonds = null;
    this.ndDiamonds = null;
    this.lblDiamondReward = null;
    this.spRewardDiamonds = null;

    this.lblReward = null;
    this.lblWheel = null;

    this.spYellow1 = null;
    this.spYellow2 = null;
    this.spYellow3 = null;

    this.spBlack1 = null;
    this.spBlack2 = null;
    this.spBlack3 = null;

    this.spYellows = [];
    //this.spBlacks = [];
};

game.utils.inherits(PassController, BaseCCBController);

PassController.prototype.onExit = function () {
    this._replayCallback = null;
    this._nextCallback = null;
    game.eventDispatcher.removeEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.removeEventListener("dialog_closed", this.onDialogClosed, this);
    this.removeNativeAd();
};

PassController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.addEventListener("dialog_closed", this.onDialogClosed, this);
    if (game.adsManager.showTopBanner) {
        game.adsManager.removeBannerAds("top");
    }
};

PassController.prototype.onDialogPoped = function () {
    this.updateNativeAd();
};

PassController.prototype.onDialogClosed = function () {
    this.updateNativeAd();
};

PassController.prototype.updateNativeAd = function () {
    if (game.dialogManager.isTopestDialog(this.rootNode)) {
        this.showNativeAd();
    } else {
        this.removeNativeAd();
    }
};

PassController.prototype.showNativeAd = function () {
    game.adsManager.showNativeAd("pass", 0, 0);
};

PassController.prototype.removeNativeAd = function () {
    game.adsManager.removeNativeAd("pass");
};

PassController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this.lblReward.setString(_("watch_ads_get_boosts"));
    this.lblWheel.setString(_("lucky_wheel_title"));

    this.spYellows = [this.spYellow1, this.spYellow2, this.spYellow3];

    var star = GameMan.getInstance().currentStar;
    for (var i = 0; i < 3; ++i) {
        this.spYellows[i].visible = (star >= i + 1);
    }

    for (i = 0; i < star; ++i) {
        setTimeout(function (index) {
            return function () {
                game.audioPlayer.playEffectByKey("star_" + (index + 1));
                game.audioPlayer.vibrateShort();
            };
        }(i), 250 * (i + 1));
    }

    if (game.gameMan.getCurrentRewardDiamonds() > 0) {
        this.ndClaimDiamonds.visible = true;
        this.lblDiamondReward.setString(game.gameMan.getCurrentRewardDiamonds());
        setTimeout(this.doClaimDiamonds.bind(this), 900);
    } else {
        this.ndClaimDiamonds.visible = false;
    }

    if (!game.utils.isPad()) {
        this.rootNode.addChild(RemoveAdsController.createFromCCB());
    }
};

PassController.prototype.doClaimDiamonds = function () {
    //game.audioPlayer.playEffectByKey("coins_fly");
    var diamondPos = this.spRewardDiamonds.parent.convertToWorldSpace(this.spRewardDiamonds.getPosition());
    var diamndEndPos = this.ndDiamonds.parent.convertToWorldSpace(this.ndDiamonds.getPosition());
    game.effectMan.playFlyCoins(diamondPos, diamndEndPos, 10, 500, function () {
        game.playerMan.addDiamonds(game.gameMan.getCurrentRewardDiamonds(), "pass_level");
    }, function () {
        //this.ndClaimDiamonds.runAction(cc.sequence(cc.delayTime(1), cc.fadeOut(0.3)));
    }.bind(this));
};

PassController.prototype.initWith = function (replayCallback, nextCallback) {
    this._replayCallback = replayCallback;
    this._nextCallback = nextCallback;
};

PassController.prototype.onAnimEnd = function () {
     var showedRate = GameMan.getInstance().showRate();
     if (!showedRate) {
         if (!game.gameMan.tryShowPassPopup()) {
             game.adsHelper.showPassAds();
         }
     }
};

PassController.prototype.onUpdateDiamonds = function () {
    this.lbDiamonds.setString(game.playerMan.getDiamonds());
};

PassController.prototype.nextClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    if (this._nextCallback) {
        this._nextCallback();
    }
    game.adsHelper.showPassAds();
    GameMan.getInstance().showRegisterNotification();
    this.close();
};

PassController.prototype.restartClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.adsHelper.showPassAds();
    if (this._replayCallback) {
        this._replayCallback();
    }
    this.close();
};

PassController.prototype.homeClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.adsHelper.showBackHomeAds();
    game.sceneMan.switchScene(game.sceneType.MENU);
};

PassController.prototype.watchAdsClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.analyseManager.trackEvent("PassFreeDiamonds");
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "wingift" : "jili05", null, "WinAndWatchDiamondsAds");
};

PassController.prototype.wheelClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.analyseManager.trackEvent("PassWheel");
    var WheelType = require("../enum/WheelType");
    game.popupMan.popupWheelDlg(WheelType.DailyBonus);
};

PassController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

PassController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

PassController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/pass_view.ccbi", null, "PassController", new PassController());
    return node;
};

module.exports = PassController;
},{"../enum/WheelType":121,"../events/EventsName":122,"../model/GameMan":124,"../model/StoreHelper":129,"./RemoveAdsController":77}],74:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */
var AdsPlace = require("../../common/enum/AdsPlace");
var DiamondsController = require("../controller/DiamondsController");
var AdsReminderController = require("../controller/AdsReminderController");

var PauseController = function () {
    BaseCCBController.call(this);
    this.lblReward = null;

    this.ndAdReminder = null;
    this.ndDiamonds = null;

    this._replayCallback = null;
    this._nextCallback = null;
};

game.utils.inherits(PauseController, BaseCCBController);

PauseController.prototype.onExit = function () {
    this._resumeCallback = null;
    game.eventDispatcher.removeEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.removeEventListener("dialog_closed", this.onDialogClosed, this);
    this.removeNativeAd();
};

PauseController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener("dialog_poped", this.onDialogPoped, this);
    game.eventDispatcher.addEventListener("dialog_closed", this.onDialogClosed, this);
    //this.showNativeAd();
};

PauseController.prototype.onDialogPoped = function () {
    this.updateNativeAd();
};

PauseController.prototype.onDialogClosed = function () {
    this.updateNativeAd();
};

PauseController.prototype.updateNativeAd = function () {
    if (game.dialogManager.isTopestDialog(this.rootNode)) {
        this.showNativeAd();
    } else {
        this.removeNativeAd();
    }
};

PauseController.prototype.showNativeAd = function () {
    game.adsManager.showNativeAd("pause", 0, 99);
};

PauseController.prototype.removeNativeAd = function () {
    game.adsManager.removeNativeAd("pause");
};

PauseController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lblReward.setString(_("watch_ads_get_boosts"));
    this.ndAdReminder.addChild(AdsReminderController.createFromCCB());
    this.ndDiamonds.addChild(DiamondsController.createFromCCB());
};

PauseController.prototype.initWith = function (resumeCallback) {
    this._resumeCallback = resumeCallback;
};

PauseController.prototype.resumeClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    if (this._resumeCallback) {
        this._resumeCallback();
    }
    this.close();
};

PauseController.prototype.homeClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.analyseManager.trackEvent("PauseHome");
    game.popupMan.popupYesNoCommonDlg(_("exit_game_confirm"), _("yes_title"), _("no_title"), function () {
        game.sceneMan.switchScene(game.sceneType.MENU);
        game.adsHelper.showBackHomeAds();
    });
};

PauseController.prototype.restartClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    game.gameMan.addFailCount();
    game.sceneMan.switchScene(game.sceneType.GAME);
    game.adsHelper.showRefreshAds();
    game.analyseManager.trackEvent("PauseRetry");
};

PauseController.prototype.watchAdsClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "pause" : "pause");
};

PauseController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

PauseController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

PauseController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/pause_view.ccbi", null, "PauseController", new PauseController());
    return node;
};

module.exports = PauseController;
},{"../../common/enum/AdsPlace":10,"../controller/AdsReminderController":50,"../controller/DiamondsController":59,"../model/StoreHelper":129}],75:[function(require,module,exports){
//var SkinItemController = require("./SkinItemController");
//var ConfigMan = require("../config/ConfigMan");
//var EventsName = require("../events/EventsName");
//
//var GRID_SIZE = cc.size(350, 500);
//
//var StoreItemCellView = cc.TableViewCell.extend({
//    entity: null,
//    itemNode: null,
//    ctor: function () {
//        this._super();
//        this.itemNode = SkinItemController.createFromCCB();
//        this.addChild(this.itemNode);
//        this.itemNode.setPosition(cc.p(GRID_SIZE.width * 0.5, GRID_SIZE.height * 0.5));
//    },
//
//    initWith: function (entity, idx, inited) {
//        this.entity = entity;
//        this.itemNode.controller.initWith(entity, idx);
//    }
//});
var RankType = require("../enum/RankType");

var RankController = function () {
    BaseCCBController.call(this);
    this.ndContainer = null;
    this.lblTitle = null;

    this.rankType = 0;

    this.updateCount = 0;
};

game.utils.inherits(RankController, BaseCCBController);

RankController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    //this.rootNode.schedule(this.onUpdate.bind(this));
    this.intervalKey = setInterval(this.onUpdate.bind(this), 500);
};

RankController.prototype.onExit = function () {
    //this.rootNode.unschedule(this.onUpdate.bind(this));
    clearInterval(this.intervalKey);
    if (this.closeCallback) {
        this.closeCallback();
    }
    this.closeCallback = null;
    BaseCCBController.prototype.onExit.call(this);
};

RankController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    ////onewx.social.loadShareCanvas(this.ndContainer);
    //this.onUpdate(0);
};

RankController.prototype.init = function (rankType, closeCallback) {
    this.rankType = rankType;
    this.closeCallback = closeCallback;
    if (rankType === RankType.Friends) {
        this.lblTitle.setString(game.local.getValue("friends_rank_title"));
    } else {
        this.lblTitle.setString(game.local.getValue("group_rank_title"));
    }
    if (this.rankType === RankType.Friends) {
        onewx.social.initFriend();
    } else {
        onewx.social.initGroup();
    }
    this.refreshRank();
};

RankController.prototype.refreshRank = function () {
    this.updateCount = 0;
    this.onUpdate(0);
};

RankController.prototype.onUpdate = function () {
    if (this.updateCount <= 10) {
        onewx.social.loadShareCanvas(this.ndContainer);
        this.updateCount++;
    }
};

RankController.prototype.prevClicked = function (sender) {
    AudioHelper.playBtnSound();
    onewx.social.onPageChange(this.ndContainer, -1);
    this.refreshRank();
};

RankController.prototype.nextClicked = function (sender) {
    AudioHelper.playBtnSound();
    onewx.social.onPageChange(this.ndContainer, 1);
    this.refreshRank();
};

RankController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

RankController.prototype.challengeClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.sceneMan.switchScene(game.sceneType.GAME);
};

RankController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

RankController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

RankController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/rank_view.ccbi", null, "RankController", new RankController());
    return node;
};

module.exports = RankController;
},{"../enum/RankType":115}],76:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var ReliveController = function () {
    BaseCCBController.call(this);

    this.lbCostDiamonds = null;

    this._reliveCallback = null;
    this._cancelCallback = null;
};

game.utils.inherits(ReliveController, BaseCCBController);

ReliveController.prototype.onExit = function () {
    BaseCCBController.prototype.onExit.call(this);
    this._reliveCallback = null;
    this._cancelCallback = null;
};

ReliveController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    this.lbCostDiamonds.setString("x" + game.config.relifeDiamonds);
};

ReliveController.prototype.watchAdsClicked = function (sender) {
    game.audioPlayer.playEffectByKey("enter");
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "relive" : "relive");
};

ReliveController.prototype.reliveClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (StoreHelper.getInstance().reliveLevel(game.gameMan.levelId)) {
        if (this._reliveCallback) {
            this._reliveCallback();
        }
        this.close();
    }
};

ReliveController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._cancelCallback) {
        this._cancelCallback();
    }
    this.close();
};

ReliveController.prototype.initWith = function (reliveCallback, cancelCallback) {
    this._reliveCallback = reliveCallback;
    this._cancelCallback = cancelCallback;
};

ReliveController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

ReliveController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

ReliveController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/relife_view.ccbi", null, "ReliveController", new ReliveController());
    return node;
};

module.exports = ReliveController;
},{"../model/StoreHelper":129}],77:[function(require,module,exports){
var EventsName = require("../events/EventsName");

var RemoveAdsController = function () {
    BaseCCBController.call(this);
};

game.utils.inherits(RemoveAdsController, BaseCCBController);

RemoveAdsController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    if (game.playerMan.player.removedAds || game.utils.isAndroidAndSelfGame()) {
        this.rootNode.visible = false;
    }
};

RemoveAdsController.prototype.removeAdsClicked = function () {
    AudioHelper.playBtnSound();
    var StoreType = require("../enum/StoreType");
    var StoreHelper = require("../model/StoreHelper");
    var removeAdEntity = StoreHelper.getInstance().getStoreEntityByType(StoreType.REMOVE_ADS);
    StoreHelper.getInstance().buyProduct(removeAdEntity);
};

RemoveAdsController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/remove_ads_view.ccbi", null, "RemoveAdsController", new RemoveAdsController(), true);
    return node;
};

module.exports = RemoveAdsController;
},{"../enum/StoreType":120,"../events/EventsName":122,"../model/StoreHelper":129}],78:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var RewardDoubleController = function () {
    BaseCCBController.call(this);

    this._titleLabel = null;

    this.lbReward = null;
    this.spReward = null;
    this.spRewardBg = null;

    //this.btnCloseCn = null;
    //this.btnCloseEn = null;

    this.lbDouble = null;

    this.closeCallback = null;

    this.doubled = false;
    this.rewardName = "";
};

game.utils.inherits(RewardDoubleController, BaseCCBController);

RewardDoubleController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    //this.spTitleCn.visible = false;
    //this.spTitleEn.visible = false;
    //if (game.local.isChinese()) {
    //    this.btnCloseCn.visible = true;
    //    //this.spTitleCn.visible = true;
    //} else {
    //    this.btnCloseEn.visible = true;
    //    //this.spTitleEn.visible = true;
    //}
    this.lbDouble.setString(_("double_rewards"));

    game.audioPlayer.playEffectByKey("get_diamonds");
};

RewardDoubleController.prototype.init = function (image, count, rewardName, closeCallback) {
    console.log("RewardDoubleController.prototype.init");
    this.spReward.setSpriteFrame(image);
    this.lbReward.setString("X" + count);
    this.closeCallback = closeCallback;
    this.rewardName = rewardName;

    this.spRewardBg.runAction(cc.rotateBy(2, 360).repeatForever());
};

RewardDoubleController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

RewardDoubleController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    var self = this;
    StoreHelper.getInstance().checkAndShowRewardVideo(this.rewardName, function (rewarded) {
        if (rewarded) {
            self.doubled = true;
            self.close();
        }
    });
};

RewardDoubleController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 210});
};

RewardDoubleController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback(this.doubled);
        this.closeCallback = null;
    }
};

RewardDoubleController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/reward_double_view.ccbi", null, "RewardDoubleController", new RewardDoubleController());
    return node;
};

module.exports = RewardDoubleController;
},{"../model/StoreHelper":129}],79:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");
var GameMan = require("../model/GameMan");
var BoostType = require("../enum/BoostType");

var RewardGiftController = function () {
    BaseCCBController.call(this);

    this.lbTitle = null;

    this.lbTips = null;
    this.lbButton = null;

    this.closeCallback = null;
};

game.utils.inherits(RewardGiftController, BaseCCBController);

RewardGiftController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbTitle.setString(_("gift_title"));
    this.lbTips.setString(_("gift_tips"));
    this.lbButton.setString(_("gift_button"));

    //this.lbTips.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
};

RewardGiftController.prototype.init = function (closeCallback) {
    this.closeCallback = closeCallback;
};

RewardGiftController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

RewardGiftController.prototype.giftClicked = function (sender) {
    AudioHelper.playBtnSound();
    var self = this;
    var share = GameMan.getInstance().getShareConfig();
    game.shareManager.wxGroupShare(share, "gift_share", function (shared) {
        if (shared) {
            var splitCount = game.utils.randomNextIntInRange(2, 3);
            var threeBallCount = game.utils.randomNextIntInRange(2, 3);
            StoreHelper.getInstance().popupBoostRewardDlg(splitCount, threeBallCount, function () {
                self.close();
            });
        } else {
            game.utils.showWXToast("需要分享到群");
        }
    });
};

RewardGiftController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 210});
};

RewardGiftController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback();
        this.closeCallback = null;
    }
};

RewardGiftController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/reward_gift_view.ccbi", null, "RewardGiftController", new RewardGiftController());
    return node;
};

module.exports = RewardGiftController;
},{"../enum/BoostType":110,"../model/GameMan":124,"../model/StoreHelper":129}],80:[function(require,module,exports){


var RewardNoticeController = function () {
    BaseCCBController.call(this);
    this.ndReward1 = null;
    this.ndReward2 = null;

    this.spReward1 = null;
    this.lbReward1 = null;
    this.spReward2 = null;
    this.lbReward2 = null;

    this.spReward = null;
    this.lbReward = null;

    this.lblOk = null;

    this._okCallFunc = null;
};

game.utils.inherits(RewardNoticeController, BaseCCBController);

RewardNoticeController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.ndReward1.visible = false;
    this.ndReward2.visible = false;

    game.audioPlayer.playEffectByKey("get_diamonds");

    //this.spBg.runAction(cc.rotateBy(2, 360).repeatForever());
};

RewardNoticeController.prototype.initWithRewardYes = function (info, okCallFunc, reward1Sprite, reward1Count,
                                                      reward2Sprite, reward2Count) {
    var spriteFrame;
    if (reward1Sprite && reward2Sprite) {
        this.ndReward2.visible = true;
        //this.lbReward2Info.setString(info);
        //this.lbReward2Info.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward1Sprite);
        if (spriteFrame) {
            this.spReward1.setSpriteFrame(spriteFrame);
        }
        this.lbReward1.setString("x" + reward1Count);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward2Sprite);
        if (spriteFrame) {
            this.spReward2.setSpriteFrame(spriteFrame);
        }
        this.lbReward2.setString("x" + reward2Count);
    } else {
        this.ndReward1.visible = true;
        //this.lbRewardInfo.setString(info);
        //this.lbRewardInfo.setAlignment(cc.TEXT_ALIGNMENT_CENTER);
        spriteFrame = cc.spriteFrameCache.getSpriteFrame(reward1Sprite);
        if (spriteFrame) {
            this.spReward.setSpriteFrame(spriteFrame);
        }
        this.lbReward.setString("x" + reward1Count);
    }

    this.lblOk.setString(game.local.getValue("confirm_info"));
    this._okCallFunc = okCallFunc;
};

RewardNoticeController.prototype.okClicked = function (sender) {
    AudioHelper.playBtnSound();
    if (this._okCallFunc) {
        this._okCallFunc();
    }
    this.close();
};

RewardNoticeController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

RewardNoticeController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

RewardNoticeController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/reward_notice_view.ccbi", null, "RewardNoticeController", new RewardNoticeController());
    return node;
};

module.exports = RewardNoticeController;
},{}],81:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var RewardVideoController = function () {
    BaseCCBController.call(this);

    this._titleLabel = null;

    this.spReward1 = null;
    this.lbReward1 = null;
    this.spReward2 = null;
    this.lbReward2 = null;
    this.lbReward2Info = null;
    this.lblFree = null;

    this.closeCallback = null;
};

game.utils.inherits(RewardVideoController, BaseCCBController);

RewardVideoController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbReward1.setString("X1");
    this.lbReward2.setString("X1");
    this.lbReward2Info.setString(game.local.getValue("watch_ads_tips"));
    this._titleLabel.setString(game.local.getValue("watch_ads_title"));
    this.lblFree.setString(_("free_coins_title"));
};

RewardVideoController.prototype.init = function (closeCallback) {
    this.closeCallback = closeCallback;
};

RewardVideoController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

RewardVideoController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "jili03-IOS" : "jili03");
};

RewardVideoController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

RewardVideoController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback();
        this.closeCallback = null;
    }
};

RewardVideoController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/reward_video_view.ccbi", null, "RewardVideoController", new RewardVideoController());
    return node;
};

module.exports = RewardVideoController;
},{"../model/StoreHelper":129}],82:[function(require,module,exports){
var SkinItemController = require("./SkinItemController");
var ConfigMan = require("../config/ConfigMan");
var EventsName = require("../events/EventsName");


var SettingController = function () {
    BaseCCBController.call(this);
    this.spAudioOff = null;
    this.spAudioOn = null;
    this.lbAudio = null;
    this.lbVersion = null;
    this.ndRank = null;
    this.ndVibrate = null;

    this.spVibrateOn = null;
    this.spVibrateOff = null;
    this.lblVibrate = null;
};

game.utils.inherits(SettingController, BaseCCBController);

SettingController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.updateSoundItem();
    this.updateVibrateItem();
    var version = "web";
    if (cc.sys.isNative) {
        version = jsb_dp.oneSdkBridge.getVersion();
    }
    this.lbVersion.setString(game.utils.sprintf(_("version_title"), version));
    if (cc.sys.os === cc.sys.OS_ANDROID) {
        this.ndRank.visible = false;
        this.ndVibrate.visible = false;
    }
};

SettingController.prototype.updateSoundItem = function () {
    var isSoundOn = game.audioPlayer.isEffectOn();
    this.spAudioOff.visible = false;
    this.spAudioOn.visible = false;
    if (isSoundOn) {
        this.spAudioOn.visible = true;
        this.lbAudio.setString(_("audio_on_title"));
    } else {
        this.spAudioOff.visible = true;
        this.lbAudio.setString(_("audio_off_title"));
    }
};

SettingController.prototype.updateVibrateItem = function () {
    var isSoundOn = game.audioPlayer.isVibrateOn();
    this.spVibrateOff.visible = false;
    this.spVibrateOn.visible = false;
    if (isSoundOn) {
        this.spVibrateOn.visible = true;
        this.lblVibrate.setString(_("vibrate_on_title"));
    } else {
        this.spVibrateOff.visible = true;
        this.lblVibrate.setString(_("vibrate_off_title"));
    }
};

SettingController.prototype.soundClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.audioPlayer.setEffectOn(!game.audioPlayer.isEffectOn());
    game.audioPlayer.setMusicOn(!game.audioPlayer.isMusicOn());
    this.updateSoundItem();
};

SettingController.prototype.shareClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.shareWithSystem(game.utils.sprintf(game.local.getValue("share_tips"),
        game.playerMan.getLevel(), game.config.getShortPlatformDownloadUrl()));
};

SettingController.prototype.rankClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.gcManager.showLeaderboard(game.config.getLeaderBoardKey());
};

SettingController.prototype.supportClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.shareManager.sendEmail(game.config.connectEmail,
        game.local.getValue("feed_back_title"), game.local.getValue("feed_back_content"));
};

SettingController.prototype.rateClicked = function (sender) {
    AudioHelper.playBtnSound();
    cc.sys.openURL(game.config.getPlatformDownloadUrl());
};

SettingController.prototype.fanPageClicked = function (sender) {
    AudioHelper.playBtnSound();
    cc.sys.openURL(game.config.facebookFanPageUrl);
};

SettingController.prototype.likeUsClicked = function (sender) {
    AudioHelper.playBtnSound();
    cc.sys.openURL(game.config.getPlatformDownloadUrl());
};

SettingController.prototype.vibrateClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.audioPlayer.setVibrateOn(!game.audioPlayer.isVibrateOn());
    this.updateVibrateItem();
};

SettingController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

SettingController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

SettingController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

SettingController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/setting_view.ccbi", null, "SettingController", new SettingController());
    return node;
};

module.exports = SettingController;
},{"../config/ConfigMan":41,"../events/EventsName":122,"./SkinItemController":84}],83:[function(require,module,exports){
var SkinItemController = require("./SkinItemController");
var ConfigMan = require("../config/ConfigMan");
var EventsName = require("../events/EventsName");
var MultiColTableView = require("../../common/ext/MultiColTableView");

var GRID_SIZE = cc.size(270, 200);

var StoreItemCellView = cc.TableViewCell.extend({
    entity: null,
    itemNode: null,
    ctor: function () {
        this._super();
        this.itemNode = SkinItemController.createFromCCB();
        this.addChild(this.itemNode);
        this.itemNode.setPosition(cc.p(GRID_SIZE.width * 0.5, GRID_SIZE.height * 0.5));
    },

    initWith: function (entity, idx) {
        this.entity = entity;
        this.itemNode.controller.initWith(entity, idx);
    }
});

var SkinController = function () {
    BaseCCBController.call(this);
    this.ndContainer = null;

    this.lblTitle = null;

    this._tableView = null;

    //user data.
    this.configs = null;
};

game.utils.inherits(SkinController, BaseCCBController);

SkinController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    game.eventDispatcher.addEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
};

SkinController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
    BaseCCBController.prototype.onExit.call(this);
};

SkinController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lblTitle.setString(_("skin_title"));

    this.configs = ConfigMan.getInstance().getSkinList();
    this.showTableView();
};

SkinController.prototype.onUpdateSkin = function (event) {
    this.showTableView();
};

SkinController.prototype.showTableView = function () {
    if (!this._tableView) {
        var size = this.ndContainer.getContentSize();
        this._tableView = new MultiColTableView(this, size, null);
        this._tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        this._tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
        this._tableView.setMultiTableViewDelegate(this);
        this._tableView.ignoreAnchorPointForPosition(false);
        this._tableView.setAnchorPoint(cc.p(0, 0));
        this.ndContainer.addChild(this._tableView);
    } else {
        this._offset = this._tableView.getContentOffset();
    }
    this._tableView.reloadData();
    if (this._offset) {
        this._tableView.setContentOffset(this._offset);
        this._offset = null;
    }
};

SkinController.prototype.scrollViewDidScroll = function (view) {
};

SkinController.prototype.scrollViewDidZoom = function (view) {
};

SkinController.prototype.gridAtIndex = function(multiTable,  idx) {
    var cell = multiTable.dequeueGrid();
    if (!cell) {
        cell = new StoreItemCellView();
    }

    if (idx < this.configs.length) {
        var skinCfg = this.configs[idx];
        cell.initWith(skinCfg, idx);
        cell.visible = true;
    } else {
        cell.visible = false;
    }

    return cell;
};

SkinController.prototype.numberOfCellsInTableView = function(multiTable) {
    var gridsInCell = this.numberOfGridsInCell(multiTable);
    return Math.ceil(this.configs.length / gridsInCell);
};

SkinController.prototype.numberOfGridsInCell = function(multiTable, colIdx) {
    return 2;
};

SkinController.prototype.gridSizeForTable = function(table, colIdx) {
    return cc.size(270, 220);
};

SkinController.prototype.gridTouched = function(table, grid) {
};

SkinController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

SkinController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode);
};

SkinController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

SkinController.prototype.onExit = function () {
    //if (this.closeCallback) {
    //    this.closeCallback();
    //    this.closeCallback = null;
    //}
};

SkinController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/skin_view.ccbi", null, "SkinController", new SkinController());
    return node;
};

module.exports = SkinController;
},{"../../common/ext/MultiColTableView":13,"../config/ConfigMan":41,"../events/EventsName":122,"./SkinItemController":84}],84:[function(require,module,exports){
var SkinRewardType = require("../enum/SkinRewardType");
var EventsName = require("../events/EventsName");
var SkinType = require("../enum/SkinType");

var SkinItemController = function () {
    BaseCCBController.call(this);

    this.ndPurchase = null;
    this.ndOwned = null;
    this.ndWatchAds = null;

    this.lbDiamondPrice = null;
    this.lbUsing = null;
    this.lbRewardAdsCount = null;

    this.spSkin = null;

    this.idx = 0;
    this.skinCfg = null;
};

game.utils.inherits(SkinItemController, BaseCCBController);

SkinItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

SkinItemController.prototype.onEnter = function() {
    BaseCCBController.prototype.onEnter.call(this);
    game.eventDispatcher.addEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
};

SkinItemController.prototype.onExit = function() {
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
    BaseCCBController.prototype.onExit.call(this);
};
/**
 * @param {SkinConfig} data
 * @param {number} idx
 */
SkinItemController.prototype.initWith = function (data, idx) {
    this.idx = idx;
    this.skinCfg = data;
    try {
        var spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image + ".png");
        this.spSkin.setSpriteFrame(spriteFrame);

        this.ndPurchase.visible = false;
        this.ndOwned.visible = false;
        this.ndWatchAds.visible = false;

        var owned = game.playerMan.hasSkin(this.skinCfg.id);
        if (owned) {
            this.ndOwned.visible = true;
            if (data.id === game.playerMan.getCurrentSkinId()) {
                this.lbUsing.setString(_("selected_title"));
            } else {
                this.lbUsing.setString(_("select_title"));
            }
        } else {
            switch (data.type) {
                case SkinType.WatchAds:
                    var skinRewardCount = game.playerMan.getSkinAdsCount(data.id);
                    this.ndWatchAds.visible = true;
                    this.lbRewardAdsCount.setString(game.utils.sprintf("%d/%d", skinRewardCount, data.count));
                    break;
                case SkinType.Diamonds:
                    this.ndPurchase.visible = true;
                    this.lbDiamondPrice.setString(this.skinCfg.count);
                    break;
            }
        }
    } catch (ex) {
        cc.error(ex);
    }
};

SkinItemController.prototype.onUpdateSkin = function () {
    this.initWith(this.skinCfg, this.idx);
};

SkinItemController.prototype.getContentSize = function () {
    return this.spBgSelected.getContentSize();
};

SkinItemController.prototype.purchaseClicked = function () {
    AudioHelper.playBtnSound();
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().buySkin(this.skinCfg, "buy_skin_in_store");
};

SkinItemController.prototype.selectClicked = function () {
    AudioHelper.playBtnSound();
    game.playerMan.setCurrentSkinId(this.skinCfg.id);
    game.eventDispatcher.dispatchEvent(EventsName.UPDATE_SKIN);
};

SkinItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/skin_item_view.ccbi", null, "SkinItemController", new SkinItemController());
};

module.exports = SkinItemController;
},{"../enum/SkinRewardType":118,"../enum/SkinType":119,"../events/EventsName":122,"../model/StoreHelper":129}],85:[function(require,module,exports){
var SkinRewardType = require("../enum/SkinRewardType");
var EventsName = require("../events/EventsName");
var SkinType = require("../enum/SkinType");

var SkinItemTitleController = function () {
    BaseCCBController.call(this);

    this.lbSkinTitle = null;
};

game.utils.inherits(SkinItemTitleController, BaseCCBController);

SkinItemTitleController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

/**
 * @param {string} content
 */
SkinItemTitleController.prototype.initWith = function (content) {
    this.lbSkinTitle.setString(content);
};

SkinItemTitleController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/skin_item_title_view.ccbi", null, "SkinItemTitleController", new SkinItemTitleController());
};

module.exports = SkinItemTitleController;
},{"../enum/SkinRewardType":118,"../enum/SkinType":119,"../events/EventsName":122}],86:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");
var ConfigMan = require("../config/ConfigMan");
var EventsName = require("../events/EventsName");

var SpecialOfferController = function () {
    BaseCCBController.call(this);

    this.lbTitle = null;

    this.spReward1 = null;
    this.lbReward1 = null;
    this.lbReward2 = null;
    this.lbReward3 = null;
    //this.spReward2 = null;
    //this.lbReward2 = null;
    //this.lbLeftTime = null;

    this.lblOriginalPrice = null;
    this.lbPrice = null;
    this.lblDiscount = null;

    this.btnPurchase = null;

    /**
     * @type {StoreConfig}
     */
    this.specialOfferCfg = null;
};

game.utils.inherits(SpecialOfferController, BaseCCBController);

SpecialOfferController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    game.eventDispatcher.addEventListener(EventsName.PURCHASE_END, this.onPurchaseEnd, this);
};

SpecialOfferController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.PURCHASE_END, this.onPurchaseEnd, this);
    BaseCCBController.prototype.onExit.call(this);
};

SpecialOfferController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.specialOfferCfg = ConfigMan.getInstance().getSpecialOfferCfg();
    this.lbTitle.setString(_("special_offer_title"));
    this.lbReward1.setString("x" + this.specialOfferCfg.data.diamonds);
    //this.lbReward2.setString("x" + this.specialOfferCfg.data.multiple_3);
    //this.lbReward3.setString("x" + this.specialOfferCfg.data.new_3);


    this.lbPrice.setString(this.specialOfferCfg.price);
    this.lblOriginalPrice.setString(this.specialOfferCfg.original_price);
    this.lblDiscount.setString(game.utils.sprintf(_("more_title"), "" + (this.specialOfferCfg.discount_multi * 100)));
};

SpecialOfferController.prototype.init = function (closeCallback) {
    this.closeCallback = closeCallback;
};

SpecialOfferController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

SpecialOfferController.prototype.onPurchaseEnd = function (event) {
    var success = event.getUserData();
    if (success) {
        this.close();
    } else {
        this.btnPurchase.enabled = true;
    }
};

SpecialOfferController.prototype.onPurchase = function (sender) {
    AudioHelper.playBtnSound();
    this.btnPurchase.enabled = false;
    StoreHelper.getInstance().buyProduct(this.specialOfferCfg);
};

SpecialOfferController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

SpecialOfferController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback();
        this.closeCallback = null;
    }
};

SpecialOfferController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/store/special_offer_view.ccbi", null, "SpecialOfferController", new SpecialOfferController());
    return node;
};

module.exports = SpecialOfferController;
},{"../config/ConfigMan":41,"../events/EventsName":122,"../model/StoreHelper":129}],87:[function(require,module,exports){
var MultiColTableView = require("../../common/ext/MultiColTableView");
var StoreItemController = require("./StoreItemController");
var StoreHelper = require("../model/StoreHelper");
var SkinItemController = require("./SkinItemController");
var SkinItemTitleController = require("./SkinItemTitleController");
var ConfigMan = require("../config/ConfigMan");
var StoreType = require("../enum/StoreType");
var EventsName = require("../events/EventsName");

var StoreTab = {
    DIAMONDS: 0,
    SKINS: 1
};

var TabVisualConfig = {};
TabVisualConfig[StoreTab.DIAMONDS] = {
    tabNode: "tabDiamondsLight",
    unselectNode: "tabDiamondsDark",
    contentNode:"diamondsContentNode"
};
TabVisualConfig[StoreTab.SKINS] = {
    tabNode:"tabSkinLight",
    unselectNode:"tabSkinDark",
    contentNode:"skinContentNode"
};

var StoreSize = cc.size(571, 110);
var SkinSize = cc.size(285, 200);
var SkinTitleSize = cc.size(571, 58);

var StoreItemCellView = cc.TableViewCell.extend({
    entity: null,
    itemNode: null,
    ctor: function () {
        this._super();
        this.itemNode = StoreItemController.createFromCCB();
        this.addChild(this.itemNode);
        this.itemNode.setPosition(cc.p(StoreSize.width * 0.5, StoreSize.height * 0.5));
    },

    initWith: function (entity, idx) {
        this.entity = entity;
        this.itemNode.controller.initWith(entity, idx);
    }
});

var SkinItemCellView = cc.TableViewCell.extend({
    entity: null,
    itemNode: null,
    ctor: function () {
        this._super();
        this.itemNode = SkinItemController.createFromCCB();
        this.addChild(this.itemNode);
        this.itemNode.setPosition(cc.p(SkinSize.width * 0.5, SkinSize.height * 0.5));
    },

    initWith: function (entity, idx) {
        this.entity = entity;
        this.itemNode.controller.initWith(entity, idx);
    }
});

var SkinItemTitleCellView = cc.TableViewCell.extend({
    //entity: null,
    itemNode: null,
    ctor: function () {
        this._super();
        this.itemNode = SkinItemTitleController.createFromCCB();
        this.addChild(this.itemNode);
        this.itemNode.setPosition(cc.p(SkinTitleSize.width * 0.5, SkinTitleSize.height * 0.5));
    },

    initWith: function (content) {
        //this.entity = entity;
        this.itemNode.controller.initWith(content);
    }
});

var SKIN_TITLE_COL_INDEX = 12;

var StoreController = function () {
    BaseCCBController.call(this);
    //this.lbChapterName = null;
    this.ndContainer = null;

    this.ndTitle = null;
    this.lbStoreName = null;

    this.lbDiamonds = null;

    //user data.
    this.configs = null;
    this.closeCallback = null;
};

game.utils.inherits(StoreController, BaseCCBController);

StoreController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.DIAMONDS_UPDATE, this.onUpdateDiamonds, this);
    game.eventDispatcher.removeEventListener(EventsName.UPDATE_AIM_ITEM, this.onUpdateAimItem, this);
    if (this.closeCallback) {
        this.closeCallback();
        this.closeCallback = null;
    }
};

StoreController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener(EventsName.UPDATE_AIM_ITEM, this.onUpdateAimItem, this);
    game.eventDispatcher.addEventListener(EventsName.DIAMONDS_UPDATE, this.onUpdateDiamonds, this);
    //this.refreshUI();
    this.onUpdateDiamonds();
};

StoreController.prototype.onUpdateDiamonds = function () {
    this.lbDiamonds.setString(game.playerMan.getDiamonds());
};

StoreController.prototype.onUpdateAimItem = function () {
    var diamondsTableView = this[TabVisualConfig[StoreTab.DIAMONDS].contentNode];
    if (diamondsTableView) {
        diamondsTableView.reloadData();
    }
};

StoreController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lbStoreName.setString(game.local.getValue("store_title"));
    this.initStoreUI();
};

StoreController.prototype.initStoreUI = function () {
    //var originalTab = this.currentTab;
    var skinConfigs = ConfigMan.getInstance().getSkinList();
    cc.log("skinConfigs length:" + skinConfigs.length);
    //this.currentTab = StoreTab.SKINS;
    this[TabVisualConfig[StoreTab.SKINS].contentNode] = this.getTableView({
        gridAtIndex: function (multiTable, idx) {
            //var cell = multiTable.dequeueGrid();
            //if (!cell) {
            //    cell = new SkinItemCellView();
            //}
            var skinCell;
            var skinTitleCell;
            if (idx === 0) {
                skinTitleCell = new SkinItemTitleCellView();
                skinTitleCell.initWith(_("watch_ads_get_skin_title"));
            } else if (idx === 1) {
                skinTitleCell = new SkinItemTitleCellView();
                skinTitleCell.visible = false;
            } else if (idx === SKIN_TITLE_COL_INDEX * 2) {
                skinTitleCell = new SkinItemTitleCellView();
                skinTitleCell.initWith(_("cost_diamonds_get_skin_title"));
            } else if (idx === SKIN_TITLE_COL_INDEX * 2 + 1) {
                skinTitleCell = new SkinItemTitleCellView();
                skinTitleCell.visible = false;
            } else {
                skinCell = new SkinItemCellView();
            }

            if (skinCell) {
                var config;
                if (idx > 1 && idx < SKIN_TITLE_COL_INDEX * 2) {
                    config = skinConfigs[idx - 2];
                } else {
                    config = skinConfigs[idx - 4];
                }
                if (config) {
                    skinCell.initWith(config, idx);
                    skinCell.visible = true;
                } else {
                    skinCell.visible = false;
                }
            }

            if (skinCell) {
                return skinCell;
            }
            return skinTitleCell;
        },

        numberOfCellsInTableView: function (multiTable) {
            var gridsInCell = this.numberOfGridsInCell(multiTable);
            return Math.ceil(skinConfigs.length / gridsInCell) + 2;
        },

        numberOfGridsInCell: function (multiTable, colIdx) {
            return 2;
        },

        gridSizeForTable: function (table, colIdx) {
            //return cc.size(200, 200);
            if (colIdx === 0) {
                return cc.size(SkinTitleSize.width, SkinTitleSize.height + 15);
            } else if (colIdx === SKIN_TITLE_COL_INDEX) {
                return cc.size(SkinTitleSize.width, SkinTitleSize.height);
            } else {
                return cc.size(SkinSize.width, SkinSize.height);
            }
        }
    }, {
        gridTouched: function (table, grid) {
            //cc.log("grid touched at index: " + grid.getIdx());
            //var entity = grid.entity;
            //AudioHelper.playBtnSound();
            //StoreHelper.getInstance().buySkin(entity);
        }
    });

    var diamondConfigs = ConfigMan.getInstance().getStoreListWithoutFirstPurchase();
    //this.currentTab = StoreTab.DIAMONDS;
    this[TabVisualConfig[StoreTab.DIAMONDS].contentNode] = this.getTableView({
        gridAtIndex: function (multiTable, idx) {
            var cell = multiTable.dequeueGrid();
            if (!cell) {
                cell = new StoreItemCellView();
            }

            if (idx < diamondConfigs.length) {
                var config = diamondConfigs[idx];
                cell.initWith(config, idx);
                cell.visible = true;
            } else {
                cell.visible = false;
            }

            return cell;
        },

        numberOfCellsInTableView: function (multiTable) {
            return diamondConfigs.length;
        },

        numberOfGridsInCell: function (multiTable, colIdx) {
            return 1;
        },

        gridSizeForTable: function (table, colIdx) {
            return StoreSize;
        }
    }, {
        gridTouched: function (table, grid) {
            //cc.log("grid touched at index: " + grid.getIdx());
            //var entity = grid.entity;
            //AudioHelper.playBtnSound();
            //StoreHelper.getInstance().buyProduct(entity);
        }
    });

    //this.currentTab = originalTab;
};

StoreController.prototype.refreshUI = function() {
    this.currentTab = this.currentTab || StoreTab.DIAMONDS;
    cc.log("StoreController.prototype.refreshUI:" + this.currentTab);
    //this.currentTab = StoreTab.SKINS;
    for(var i in TabVisualConfig) {
        //var tabNode = this[TabVisualConfig[i].tabNode];
        var unSelectNode = this[TabVisualConfig[i].unselectNode];
        var contentNode = this[TabVisualConfig[i].contentNode];
        //tabNode && tabNode.setVisible(Number(i) === this.currentTab);
        contentNode && contentNode.setVisible(Number(i) === this.currentTab);
        unSelectNode && unSelectNode.setVisible(Number(i) !== this.currentTab);
    }
};

StoreController.prototype.initWith = function (type, callback) {
    cc.log("StoreController.prototype.initWith:" + type);
    if (type === StoreType.SKIN) {
        this.currentTab = StoreTab.SKINS;
    } else if (type === StoreType.DIAMOND) {
        this.currentTab = StoreTab.DIAMONDS;
    }
    this.refreshUI();
    this.closeCallback = callback;
};

StoreController.prototype.getTableView = function (dataSource, delegate) {
    var tableView = new MultiColTableView(dataSource, this.ndContainer.getContentSize(), null);
    tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    tableView.setMultiTableViewDelegate(delegate);
    tableView.ignoreAnchorPointForPosition(false);
    tableView.setAnchorPoint(cc.p(0, 0));
    tableView.reloadData();
    this.ndContainer.addChild(tableView);
    return tableView;
};

StoreController.prototype.onClickSkin = function () {
    AudioHelper.playBtnSound();
    this.currentTab = StoreTab.SKINS;
    this.refreshUI();
};

StoreController.prototype.onClickDiamonds = function () {
    AudioHelper.playBtnSound();
    this.currentTab = StoreTab.DIAMONDS;
    this.refreshUI();
};

StoreController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

StoreController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

StoreController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

StoreController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/store/store_view.ccbi", null, "StoreController", new StoreController());
    return node;
};

module.exports = StoreController;
},{"../../common/ext/MultiColTableView":13,"../config/ConfigMan":41,"../enum/StoreType":120,"../events/EventsName":122,"../model/StoreHelper":129,"./SkinItemController":84,"./SkinItemTitleController":85,"./StoreItemController":88}],88:[function(require,module,exports){
var StoreType = require("../enum/StoreType");
var EventsName = require("../events/EventsName");

var StoreItemController = function () {
    BaseCCBController.call(this);

    //price
    this.lbPrice = null;
    this.spRewardedVideo = null;
    this.ndDiamondPrice = null;
    this.lbDiamondPrice = null;

    //node
    this.ndRestore = null;
    this.ndBoosts = null;
    this.ndDiamond = null;
    this.ndPurchase = null;
    this.ndOwned = null;

    //
    this.lbSplit = null;
    this.lbNewThree = null;
    this.lbDiamond = null;
    this.spDiamond = null;

    //tag
    this.spHotTag = null;
    this.spFreeTag = null;
    this.spPercentTag = null;

    this.spRedBg = null;

    this.lbTag = null;

    this.btnClaim = null;

    this.ndReminder = null;

    this.idx = 0;
};

game.utils.inherits(StoreItemController, BaseCCBController);

StoreItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

/**
 * @param {StoreConfig} data
 * @param {number} idx
 */
StoreItemController.prototype.initWith = function (data, idx) {
    this.storeEntity = data;
    this.idx = idx;
    this.lbPrice.setString(data.price);

    try {

        this.ndRestore.visible = false;
        this.ndBoosts.visible = false;
        this.ndDiamond.visible = false;
        this.ndPurchase.visible = true;
        this.ndOwned.visible = false;

        this.lbPrice.visible = false;
        this.ndDiamondPrice.visible = false;
        this.spRewardedVideo.visible = false;

        this.spHotTag.visible = false;
        this.spFreeTag.visible = false;
        this.spPercentTag.visible = false;

        this.lbTag.visible = false;

        this.spRedBg.visible = false;

        this.btnClaim.enabled = true;

        this.ndReminder.visible = false;

        var spriteFrame;
        switch (data.type) {
            case StoreType.FREE:
                this.ndDiamond.visible = true;
                this.lbDiamond.setString(data.count);
                this.spRewardedVideo.visible = true;
                spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image);
                if (spriteFrame) {
                    this.spDiamond.setSpriteFrame(spriteFrame);
                }
                //tag
                this.spFreeTag.visible = true;
                this.lbTag.visible = true;
                this.lbTag.setString(_("free_coins_title"));
                this.ndReminder.visible = true;
                break;
            case StoreType.REMOVE_ADS:
                this.ndDiamond.visible = true;
                this.lbDiamond.setString(game.local.getValue("remove_ads_title"));
                spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image);
                if (spriteFrame) {
                    this.spDiamond.setSpriteFrame(spriteFrame);
                }
                this.lbPrice.visible = true;
                this.spHotTag.visible = true;
                this.lbTag.visible = true;
                this.lbTag.setString(_("hot_title"));
                break;
            case StoreType.AIM_ITEM:
                this.ndDiamond.visible = true;
                this.lbDiamond.setString(game.local.getValue("aim_item_title"));
                spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image);
                if (spriteFrame) {
                    this.spDiamond.setSpriteFrame(spriteFrame);
                }
                //this.lbPrice.visible = true;

                if (game.playerMan.player.hasAimItem) {
                    this.ndOwned.visible = true;
                    this.ndPurchase.visible = false;
                } else {
                    this.ndPurchase.visible = true;
                    this.lbPrice.visible = true;
                }
                // this.spHotTag.visible = true;
                // this.lbTag.visible = true;
                // this.lbTag.setString(_("hot_title"));
                break;
            case StoreType.RESTORE:
                this.ndRestore.visible = true;
                this.ndPurchase.visible = false;
                this.spRedBg.visible = true;
                break;
            case StoreType.NEW_AND_SPLIT:
                this.ndBoosts.visible = true;
                this.lbSplit.setString("x" + data.data.multiple_3);
                this.lbNewThree.setString("x" + data.data.multiple_3);
                this.ndDiamondPrice.visible = true;
                this.lbDiamondPrice.setString(data.count);
                break;
            case StoreType.DIAMOND:
                this.ndDiamond.visible = true;
                this.lbDiamond.setString(data.count);
                this.lbPrice.visible = true;
                spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image);
                if (spriteFrame) {
                    this.spDiamond.setSpriteFrame(spriteFrame);
                }
                //tag
                if (data.extra > 0) {
                    this.spPercentTag.visible = true;
                    this.lbTag.visible = true;
                    this.lbTag.setString("+" + (data.extra * 100) + "%");
                }
                break;
        }
    } catch (ex) {
        cc.error(ex);
    }
};

StoreItemController.prototype.getContentSize = function () {
    return this.spBg.getContentSize();
};

StoreItemController.prototype.purchaseClicked = function () {
    AudioHelper.playBtnSound();
    var StoreHelper = require("../model/StoreHelper");
    StoreHelper.getInstance().buyProduct(this.storeEntity);
};

StoreItemController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/store/store_item_view.ccbi", null, "StoreItemController", new StoreItemController());
    return node;
};

module.exports = StoreItemController;
},{"../enum/StoreType":120,"../events/EventsName":122,"../model/StoreHelper":129}],89:[function(require,module,exports){
var TaskItemController = require("./TaskItemController");
var ConfigMan = require("../config/ConfigMan");
var EventsName = require("../events/EventsName");
var MultiColTableView = require("../../common/ext/MultiColTableView");

var GRID_SIZE = cc.size(270, 200);

var StoreItemCellView = cc.TableViewCell.extend({
    entity: null,
    itemNode: null,
    ctor: function () {
        this._super();
        this.itemNode = TaskItemController.createFromCCB();
        this.addChild(this.itemNode);
        this.itemNode.setPosition(cc.p(GRID_SIZE.width * 0.5, GRID_SIZE.height * 0.5));
    },

    initWith: function (entity, idx) {
        this.entity = entity;
        this.itemNode.controller.initWith(entity, idx);
    }
});

var TaskController = function () {
    BaseCCBController.call(this);
    this.ndContainer = null;

    this.lblTitle = null;

    this._tableView = null;

    //user data.
    this.configs = null;
};

game.utils.inherits(TaskController, BaseCCBController);

TaskController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    //game.eventDispatcher.addEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
};

TaskController.prototype.onExit = function () {
    //game.eventDispatcher.removeEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
    BaseCCBController.prototype.onExit.call(this);
};

TaskController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.lblTitle.setString(_("task_title"));

    this.configs = ConfigMan.getInstance().getTaskList();
    this.showTableView();
};

TaskController.prototype.onUpdateSkin = function (event) {
    this.showTableView();
};

TaskController.prototype.showTableView = function () {
    if (!this._tableView) {
        var size = this.ndContainer.getContentSize();
        this._tableView = new MultiColTableView(this, size, null);
        this._tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        this._tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
        this._tableView.setMultiTableViewDelegate(this);
        this._tableView.ignoreAnchorPointForPosition(false);
        this._tableView.setAnchorPoint(cc.p(0, 0));
        this.ndContainer.addChild(this._tableView);
    } else {
        this._offset = this._tableView.getContentOffset();
    }
    this._tableView.reloadData();
    if (this._offset) {
        this._tableView.setContentOffset(this._offset);
        this._offset = null;
    }
};

TaskController.prototype.scrollViewDidScroll = function (view) {
};

TaskController.prototype.scrollViewDidZoom = function (view) {
};

TaskController.prototype.gridAtIndex = function(multiTable,  idx) {
    var cell = multiTable.dequeueGrid();
    if (!cell) {
        cell = new StoreItemCellView();
    }

    if (idx < this.configs.length) {
        var skinCfg = this.configs[idx];
        cell.initWith(skinCfg, idx);
        cell.visible = true;
    } else {
        cell.visible = false;
    }

    return cell;
};

TaskController.prototype.numberOfCellsInTableView = function(multiTable) {
    var gridsInCell = this.numberOfGridsInCell(multiTable);
    return Math.ceil(this.configs.length / gridsInCell);
};

TaskController.prototype.numberOfGridsInCell = function(multiTable, colIdx) {
    return 2;
};

TaskController.prototype.gridSizeForTable = function(table, colIdx) {
    return cc.size(270, 220);
};

TaskController.prototype.gridTouched = function(table, grid) {
};

TaskController.prototype.backClicked = function (sender) {
    AudioHelper.playBtnSound();

    this.close();
};

TaskController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

TaskController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

TaskController.prototype.onExit = function () {
    //if (this.closeCallback) {
    //    this.closeCallback();
    //    this.closeCallback = null;
    //}
};

TaskController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/task_view.ccbi", null, "TaskController", new TaskController());
    return node;
};

module.exports = TaskController;
},{"../../common/ext/MultiColTableView":13,"../config/ConfigMan":41,"../events/EventsName":122,"./TaskItemController":90}],90:[function(require,module,exports){
var SkinRewardType = require("../enum/SkinRewardType");
var EventsName = require("../events/EventsName");
var BoostType = require("../enum/BoostType");
var StoreHelper = require("../model/StoreHelper");

var TaskItemController = function () {
    BaseCCBController.call(this);

    this.lblGoal = null;
    this.lblGoalInfo = null;
    //this.spSkin = null;
    this.spBgSelected = null;

    this.lblSelect = null;
    this.btnSelect = null;
    this.ndSelect = null;

    this.lblDiamonds = null;

    //this.lblUsing = null;

    this.idx = 0;
    this.taskCfg = null;
};

game.utils.inherits(TaskItemController, BaseCCBController);

TaskItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};
/**
 * @param {TaskConfig} data
 * @param {number} idx
 */
TaskItemController.prototype.initWith = function (data, idx) {
    this.idx = idx;
    this.taskCfg = data;
    this.refresh();
};

TaskItemController.prototype.refresh = function () {
    var data = this.taskCfg;
    var completed = false;
    switch (data.type) {
        case SkinRewardType.None:
            this.lblGoal.visible = false;
            this.lblGoalInfo.visible = false;
            completed = true;
            break;
        case SkinRewardType.LevelCount:
            this.lblGoal.visible = true;
            this.lblGoalInfo.visible = true;
            this.lblGoal.setString(game.utils.sprintf(game.local.getValue("level_count_title"), data.count));
            if (game.playerMan.getLevel() >= data.count) {
                this.lblGoalInfo.setString(game.local.getValue("completed_title"));
                completed = true;
            } else {
                this.lblGoalInfo.setString(game.utils.sprintf("%d/%d", game.playerMan.getLevel(), data.count));
            }
            break;
        case SkinRewardType.WatchAdCount:
            this.lblGoal.visible = true;
            this.lblGoalInfo.visible = true;
            this.lblGoal.setString(game.utils.sprintf(game.local.getValue("watch_ad_count_title"), data.count));
            if (game.playerMan.player.interstitialAdCount >= data.count) {
                this.lblGoalInfo.setString(game.local.getValue("completed_title"));
                completed = true;
            } else {
                this.lblGoalInfo.setString(game.utils.sprintf("%d/%d", game.playerMan.player.interstitialAdCount, data.count));
            }
            break;
        case SkinRewardType.WatchRewardAdCount:
            this.lblGoal.visible = true;
            this.lblGoalInfo.visible = true;
            this.lblGoal.setString(game.utils.sprintf(game.local.getValue("watch_reward_ad_count_title"), data.count));
            if (game.playerMan.player.rewardedAdCount >= data.count) {
                this.lblGoalInfo.setString(game.local.getValue("completed_title"));
                completed = true;
            } else {
                this.lblGoalInfo.setString(game.utils.sprintf("%d/%d", game.playerMan.player.rewardedAdCount, data.count));
            }
            break;
        case SkinRewardType.Claimed:
            if (game.playerMan.hasSkin(data.id)) {
                this.lblGoal.visible = false;
                this.lblGoalInfo.visible = false;
                completed = true;
            } else {
                this.lblGoal.setString(_("skin_gift_title"));
                this.lblGoalInfo.setString("--");
            }
            break;
        case SkinRewardType.Purchase:
            if (game.playerMan.hasSkin(data.id)) {
                this.lblGoal.visible = false;
                this.lblGoalInfo.visible = false;
                completed = true;
            } else {
                this.lblGoal.setString(_("skin_purchase_title"));
                this.lblGoalInfo.setString("--");
            }
            break;
    }

    this.lblDiamonds.setString("x" + data.rewardCount);

    //var spriteFrame = cc.spriteFrameCache.getSpriteFrame(data.image + ".png");
    //this.spSkin.setSpriteFrame(spriteFrame);
    //this.lblUsing.setString(_("selected_title"));

    //this.lblUsing.visible = false;
    //this.ndSelect.visible = false;
    this.btnSelect.enabled = false;

    var claimed = game.playerMan.isTaskClaimed(this.taskCfg.id);
    this.ndSelect.visible = true;

    if (completed) {
        if (!claimed) {
            this.btnSelect.enabled = true;
            this.lblSelect.setString(game.local.getValue("claim_title"));
        } else {
            this.lblSelect.setString(game.local.getValue("claimed_title"));
        }
    } else {
        this.lblSelect.setString(_("uncompleted_title"));
    }
};

TaskItemController.prototype.getContentSize = function () {
    return this.spBgSelected.getContentSize();
};

TaskItemController.prototype.selectClicked = function () {
    AudioHelper.playBtnSound();
    cc.log("task claimed:" + game.playerMan.isTaskClaimed(this.taskCfg.id));
    if (!game.playerMan.isTaskClaimed(this.taskCfg.id)) {
        cc.log("task set claimed:" + this.taskCfg.id);
        game.playerMan.setTaskClaimed(this.taskCfg.id);
        var rewardCount = this.taskCfg.rewardCount;
        StoreHelper.getInstance().popupRewardDoubleDlg(rewardCount, BoostType.DIAMOND,  game.utils.isIOS() ? "tasks" : "tasks", function () {
        }.bind(this));
        this.refresh();
        game.eventDispatcher.dispatchEvent(EventsName.TASK_UPDATE);
    }
};

TaskItemController.createFromCCB = function() {
    return game.utils.loadNodeFromCCB("res/menu/task_item_view.ccbi", null, "TaskItemController", new TaskItemController());
};

module.exports = TaskItemController;
},{"../enum/BoostType":110,"../enum/SkinRewardType":118,"../events/EventsName":122,"../model/StoreHelper":129}],91:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/15.
 */
var EventsName = require("../events/EventsName");

var ColorList = [
    cc.color(255, 106, 107),
    cc.color(90, 181, 110),
    cc.color(83, 183, 209),
    cc.color(243, 77, 151),
    cc.color(153, 95, 206),
    cc.color(57, 103, 249),
    cc.color(249, 112, 49),
    cc.color(232, 59, 20),
    cc.color(84, 235, 43),
    cc.color(50, 84, 117),
    cc.color(127, 127, 127)
];


var TitleController = function () {
    BaseCCBController.call(this);
    this.lbCoins = null;

    this.spCoinsAdd = null;
    this.btnAdd = null;

    this.bgNode = null;
};

game.utils.inherits(TitleController, BaseCCBController);

TitleController.prototype.onEnter = function () {
    game.eventDispatcher.addEventListener(EventsName.COINS_UPDATE, this.refresh, this);
};

TitleController.prototype.onExit = function () {
    game.eventDispatcher.removeEventListener(EventsName.COINS_UPDATE, this.refresh, this);
};

TitleController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    this.refresh();
    this.randomSquares();

    if (TitleController.time > 0) {
        game.utils.playCCBAnimation(this.rootNode, "Default Timeline");
    }
    TitleController.time ++;
};

TitleController.prototype.randomSquares = function () {
    for (var i = 0; i < 20; ++i) {
        var square = new cc.Sprite("#square_circle.png");

        square.setPosition(this.getRandomPos());
        square.setColor(ColorList[game.utils.randomNextInt(ColorList.length - 1)]);
        square.setOpacity(15);
        square.setScale(1.4);

        var pos1 = this.getRandomPos();
        square.setPosition(pos1);
        var pos2 = this.getRandomPos();
        var t = this.getTime(pos1, pos2);
        var moveTo1 = cc.moveTo(t, pos2);
        var moveTo2 = cc.moveTo(t, pos1);
        var action = cc.sequence(moveTo1, moveTo2).repeatForever();
        square.runAction(action);
        square.runAction(cc.rotateBy(20, 360).repeatForever());
        this.bgNode.addChild(square);
    }
};

TitleController.prototype.getTime = function (pos1, pos2) {
    return cc.pDistance(pos1, pos2) / 20;
};

TitleController.prototype.getRandomPos = function () {
    return cc.p(game.utils.randomNextInt(cc.winSize.width * 1.5) - cc.winSize.width * 0.25,
        game.utils.randomNextInt(cc.winSize.height * 1.5) - cc.winSize.height * 0.25);
};

TitleController.prototype.initWith = function (replayCallback, nextCallback) {
    this._replayCallback = replayCallback;
    this._nextCallback = nextCallback;
};

TitleController.prototype.refresh = function () {
    this.lbCoins.setString(game.playerMan.player.coins);
};

TitleController.prototype.disableAddCoins = function () {
    this.spCoinsAdd.visible = false;
    this.btnAdd.enabled = false;
    game.utils.playCCBAnimation(this.rootNode, "none");
};

TitleController.prototype.storeClicked = function (sender) {
    AudioHelper.playBtnSound();
    game.popupMan.popupStoreDlg();
};

TitleController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/menu/title_view.ccbi", null, "TitleController", new TitleController());
    return node;
};

TitleController.time = 0;

module.exports = TitleController;
},{"../events/EventsName":122}],92:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var WatchAdsGet3StarController = function () {
    BaseCCBController.call(this);

    //this.btnCloseCn = null;
    //this.btnCloseEn = null;

    this.spYellow1 = null;
    this.spYellow2 = null;
    this.spYellow3 = null;

    this.spBlack1 = null;
    this.spBlack2 = null;
    this.spBlack3 = null;

    this.lbCollectTips = null;

    this.closeCallback = null;
    this.rewardName = null;
    this.watched = false;
};

game.utils.inherits(WatchAdsGet3StarController, BaseCCBController);

WatchAdsGet3StarController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    //if (game.local.isChinese()) {
    //    this.btnCloseCn.visible = true;
    //} else {
    //    this.btnCloseEn.visible = true;
    //}
    //game.audioPlayer.playEffectByKey("open_box");

    this.lbCollectTips.setAlignment(cc.TEXT_ALIGNMENT_CENTER);

    this.spYellows = [this.spYellow1, this.spYellow2, this.spYellow3];

    var star = game.gameMan.currentStar;
    for (var i = 0; i < 3; ++i) {
        this.spYellows[i].visible = (star >= i + 1);
    }
};

WatchAdsGet3StarController.prototype.initWith = function (rewardName, closeCallback) {
    this.closeCallback = closeCallback;
    this.rewardName = rewardName;
};

WatchAdsGet3StarController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

WatchAdsGet3StarController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().checkAndShowRewardVideo(this.rewardName, function (watched) {
        if (watched) {
            this.watched = true;
            this.close();
        }
    }.bind(this));
};

WatchAdsGet3StarController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

WatchAdsGet3StarController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback(this.watched);
        this.closeCallback = null;
    }
};

WatchAdsGet3StarController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/watch_ads_get_3star_view.ccbi", null, "WatchAdsGet3StarController", new WatchAdsGet3StarController());
    return node;
};

module.exports = WatchAdsGet3StarController;
},{"../model/StoreHelper":129}],93:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var WatchAdsGetDiamondsController = function () {
    BaseCCBController.call(this);

    //this.btnCloseCn = null;
    //this.btnCloseEn = null;

    //this.spItem = null;
    //this.lbBtnTitle = null;
    this.spDiamondBg = null;

    this.lbDiamondsCount = null;

    this.closeCallback = null;
    this.rewardName = null;
    this.watched = false;
};

game.utils.inherits(WatchAdsGetDiamondsController, BaseCCBController);

WatchAdsGetDiamondsController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    //if (game.local.isChinese()) {
    //    this.btnCloseCn.visible = true;
    //} else {
    //    this.btnCloseEn.visible = true;
    //}
    this.spDiamondBg.runAction(cc.rotateBy(3, 360).repeatForever());
    game.audioPlayer.playEffectByKey("open_box");
};

WatchAdsGetDiamondsController.prototype.initWith = function (rewardName, closeCallback) {
    this.closeCallback = closeCallback;
    this.rewardName = rewardName;
    this.lbDiamondsCount.setString("x" + game.config.dailyDiamonds);
};

WatchAdsGetDiamondsController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

WatchAdsGetDiamondsController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().checkAndShowRewardVideo(this.rewardName, function (watched) {
        if (watched) {
            this.watched = true;
            this.close();
        }
    }.bind(this));
};

WatchAdsGetDiamondsController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 225, popupAnim: true});
};

WatchAdsGetDiamondsController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback(this.watched);
        this.closeCallback = null;
    }
};

WatchAdsGetDiamondsController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/watch_ads_get_diamonds_view.ccbi", null, "WatchAdsGetDiamondsController", new WatchAdsGetDiamondsController());
    return node;
};

module.exports = WatchAdsGetDiamondsController;
},{"../model/StoreHelper":129}],94:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var WatchAdsGetItemController = function () {
    BaseCCBController.call(this);

    //this.btnCloseCn = null;
    //this.btnCloseEn = null;

    this.spItem = null;
    this.lbBtnTitle = null;

    this.closeCallback = null;
    this.rewardName = null;
    this.watched = false;
};

game.utils.inherits(WatchAdsGetItemController, BaseCCBController);

WatchAdsGetItemController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    //if (game.local.isChinese()) {
    //    this.btnCloseCn.visible = true;
    //} else {
    //    this.btnCloseEn.visible = true;
    //}
    game.audioPlayer.playEffectByKey("open_box");
};

WatchAdsGetItemController.prototype.initWith = function (title, spriteName, rewardName, closeCallback) {
    this.closeCallback = closeCallback;
    this.rewardName = rewardName;
    this.lbBtnTitle.setString(title);
    var spriteFrame = cc.spriteFrameCache.getSpriteFrame(spriteName);
    if (spriteFrame) {
        this.spItem.setSpriteFrame(spriteFrame);
    } else {
        cc.error("sprite frame is null:" + spriteName);
    }
};

WatchAdsGetItemController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

WatchAdsGetItemController.prototype.watchAdsItemClicked = function (sender) {
    this.watchAdsClicked(sender);
};

WatchAdsGetItemController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().checkAndShowRewardVideo(this.rewardName, function (watched) {
        if (watched) {
            this.watched = true;
            this.close();
        }
    }.bind(this));
};

WatchAdsGetItemController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 225, popupAnim: true});
};

WatchAdsGetItemController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback(this.watched);
        this.closeCallback = null;
    }
};

WatchAdsGetItemController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/watch_ads_get_item_view.ccbi", null, "WatchAdsGetItemController", new WatchAdsGetItemController());
    return node;
};

module.exports = WatchAdsGetItemController;
},{"../model/StoreHelper":129}],95:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var WatchAdsGetSkinController = function () {
    BaseCCBController.call(this);

    //this.btnCloseCn = null;
    //this.btnCloseEn = null;

    this.spSkin = null;
    this.lbGetSkin = null;

    this.closeCallback = null;
    this.skinCfg = null;
};

game.utils.inherits(WatchAdsGetSkinController, BaseCCBController);

WatchAdsGetSkinController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    //if (game.local.isChinese()) {.btnCloseCn
    //    this.btnCloseCn.visible = true;
    //} else {
    //    this.btnCloseEn.visible = true;
    //}
    this.lbGetSkin.setString(_("reward_video_skin"));

    game.audioPlayer.playEffectByKey("open_box");
};

WatchAdsGetSkinController.prototype.initWith = function (skinCfg) {
    this.skinCfg = skinCfg;
    var spriteFrame = cc.spriteFrameCache.getSpriteFrame(skinCfg.image + "_l.png");
    this.spSkin.setSpriteFrame(spriteFrame);
};

WatchAdsGetSkinController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

WatchAdsGetSkinController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    StoreHelper.getInstance().buySkin(this.skinCfg, "buy_skin_in_pass", function (purchased) {
        if (purchased) {
            this.close();
        }
    }.bind(this));
};

WatchAdsGetSkinController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 225, popupAnim: true});
};

WatchAdsGetSkinController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback();
        this.closeCallback = null;
    }
};

WatchAdsGetSkinController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/watch_ads_get_skin_view.ccbi", null, "WatchAdsGetSkinController", new WatchAdsGetSkinController());
    return node;
};

module.exports = WatchAdsGetSkinController;
},{"../model/StoreHelper":129}],96:[function(require,module,exports){
var StoreHelper = require("../model/StoreHelper");

var WatchAdsRelifeController = function () {
    BaseCCBController.call(this);

    this.spCircle = null;

    this.closeCallback = null;
    //this.skinCfg = null;
    this.relife = false;
};

game.utils.inherits(WatchAdsRelifeController, BaseCCBController);

WatchAdsRelifeController.prototype.onDidLoadFromCCB  = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);
};

WatchAdsRelifeController.prototype.initWith = function (callback) {
    this.closeCallback = callback;
    this.spCircle = game.utils.createProgressTimer(this.spCircle, false, true);
    this.spCircle.setPercentage(100);
    this.spCircle.runAction(cc.sequence(cc.progressTo(5, 0), cc.callFunc(this.close, this)));
};

WatchAdsRelifeController.prototype.closeClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.close();
};

WatchAdsRelifeController.prototype.watchAdsClicked = function (sender) {
    AudioHelper.playBtnSound();
    this.relife = true;
    this.close();
};

WatchAdsRelifeController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {overlayOpacity: 225, popupAnim: true});
};

WatchAdsRelifeController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
    if (this.closeCallback) {
        this.closeCallback(this.relife);
        this.closeCallback = null;
    }
};

WatchAdsRelifeController.createFromCCB = function() {
    var node = game.utils.loadNodeFromCCB("res/notice/watch_ads_relife_view.ccbi", null, "WatchAdsRelifeController", new WatchAdsRelifeController());
    return node;
};

module.exports = WatchAdsRelifeController;
},{"../model/StoreHelper":129}],97:[function(require,module,exports){
var Wheel = require("../../common/wheel/Wheel");
var ConfigMan = require("../config/ConfigMan");
var BoostType = require("../enum/BoostType");
var StoreHelper = require("../model/StoreHelper");
var GameMan = require("../model/GameMan");
var WheelType = require("../enum/WheelType");

var WheelController = function () {
    BaseCCBController.call(this);
    this.WHEEL_TIME = 5;
    //this.WHEEL_ITEM_ANGLE = 90;

    this.WHEEL_ICON_TAG = 100;
    this.WHEEL_NUM_TAG = 200;

    this.WHEEL_COUNT = 6;

    this.WHEEL_ITEM_ANGLE = 360 / this.WHEEL_COUNT;

    this.ndWheel = null;
    //this.lblLeft = null;
    //this.lblRight = null;
    this.btnLeft = null;
    this.btnRight = null;

    this.ndDailyWheel = null;
    this.ndBox = null;

    this.btnSpinAgain = null;

    this.btnClose = null;

    //this.lblLeftTips = null;
    this.lblRightTips = null;

    this.spTitleCn = null;
    this.spTitleEn = null;

    /**
     * @type {Wheel}
     */
    this.wheel = null;

    this.wheelIcons = null;
    this.wheelNums = null;

    this.wheelList = null;
};

game.utils.inherits(WheelController, BaseCCBController);

WheelController.prototype.onEnter = function () {
    BaseCCBController.prototype.onEnter.call(this);
    this.intervalKey = setInterval(this.onUpdate.bind(this), 1000);
};

WheelController.prototype.onExit = function () {
    clearInterval(this.intervalKey);
    BaseCCBController.prototype.onExit.call(this);

    if (this.closeCallback) {
        this.closeCallback();
    }
};

WheelController.prototype.onDidLoadFromCCB = function() {
    BaseCCBController.prototype.onDidLoadFromCCB.call(this);

    //this.btnCloseCn.visible = false;
    //this.btnCloseEn.visible = false;
    this.spTitleCn.visible = false;
    this.spTitleEn.visible = false;
    if (game.local.isChinese()) {
        //this.btnCloseCn.visible = true;
        this.spTitleCn.visible = true;
    } else {
        //this.btnCloseEn.visible = true;
        this.spTitleEn.visible = true;
    }

    this.wheelIcons = [];
    this.wheelNums = [];
    for (var i = 0; i < this.WHEEL_COUNT; ++i) {
        var wheelIcon = game.utils.seekNodeByTag(this.ndWheel, this.WHEEL_ICON_TAG + i);
        var wheelNum = game.utils.seekNodeByTag(this.ndWheel, this.WHEEL_NUM_TAG + i);
        this.wheelIcons.push(wheelIcon);
        this.wheelNums.push(wheelNum);
    }

};

WheelController.prototype.initWith = function (wheelType, callback) {
    this.wheelType = wheelType;
    this.closeCallback = callback;
    this.ndBox.visible = false;
    this.ndDailyWheel.visible = false;
    switch (wheelType) {
        case WheelType.DailyBonus:
            this.ndDailyWheel.visible = true;
            this.wheelList = ConfigMan.getInstance().getWheelList();
            break;
        case WheelType.Box:
            this.ndBox.visible = true;
            this.wheelList = ConfigMan.getInstance().getBoxWheelList();
            break;
    }

    this.initWheelUI();
    this.updateWheelItems();
    this.wheel = new Wheel(this.ndWheel, game.utils.getCurrentFPS());
    if (wheelType === WheelType.Box) {
        this.startWheel();
    }
};

WheelController.prototype.initWheelUI = function () {
    var wheels = this.wheelList;
    for (var i = 0; i < wheels.length; ++i) {
        var wheelIcon = this.wheelIcons[i];
        var wheelNum = this.wheelNums[i];
        wheelIcon.setSpriteFrame(wheels[i].image);
        wheelNum.setString("x" + wheels[i].count);
        wheelIcon.scale *= wheels[i].scale;
    }
};

WheelController.prototype.isShowRewardedVideo = function () {
    return game.adsManager.isRewardVideoReady();
};

WheelController.prototype.onUpdate = function () {
    this.updateWheelItems();
};

WheelController.prototype.isFreeWheel = function () {
    var leftTime = GameMan.getInstance().getWheelLeftTime();
    if (leftTime <= 0) {
        return true;
    }
    return false;
};

WheelController.prototype.getLeftHour = function () {
    var leftTime = GameMan.getInstance().getWheelLeftTime();
    return Math.ceil(leftTime / (60 * 60 * 1000));
};

WheelController.prototype.updateWheelItems = function () {
    //this.lblLeft.setString(_("wheel_reward_video_btn"));
    //this.lblLeftTips.setString(_("wheel_reward_video_tips"));

    //this.lblRight.setString(_("wheel_free_btn"));
    var freeWheel = this.isFreeWheel();
    this.btnRight.enabled = freeWheel;
    if (freeWheel) {
        this.lblRightTips.setString("");
    } else {
        this.lblRightTips.setString(game.utils.sprintf(_("wheel_free_tips"), this.getLeftHour()));
    }
};

WheelController.prototype.getRandomWheel = function () {
    var wheels = this.wheelList;
    var randomNum = game.utils.randomNextInt(100);
    console.log("randomNum:" + randomNum);
    var sumProbability = 0;
    for (var i = 0; i < wheels.length; ++i) {
        if (sumProbability + wheels[i].probability > randomNum) {
            return wheels[i];
        } else {
            sumProbability += wheels[i].probability;
        }
    }
    return null;
};

WheelController.prototype.startWheel = function () {
    this.wheelConfig = this.getRandomWheel();
    var wheelId = this.wheelConfig.id;
    console.log("random wheel id:" + wheelId);
    this.wheel.rotate(this.WHEEL_TIME, 360 * 3 + (wheelId - 1) * this.WHEEL_ITEM_ANGLE, this.WHEEL_ITEM_ANGLE, this.onRotateEnd.bind(this));
    this.btnClose.enabled = false;
    this.wheelInterval = setInterval(function () {
        game.audioPlayer.playEffectByKey("wheel_pin");
    }, 100);
    game.audioPlayer.playMusicByKey("wheel_bg");
};

WheelController.prototype.onRotateEnd = function () {
    clearInterval(this.wheelInterval);
    game.audioPlayer.stopMusic();
    game.audioPlayer.playEffectByKey("wheel_stop");
    setTimeout(this.onShowReward.bind(this), 1000);
};

WheelController.prototype.onShowReward = function () {
    var wheel = this.wheelConfig;
    StoreHelper.getInstance().popupRewardDoubleDlg(wheel.count, wheel.type, game.utils.isIOS() ? "zhuanpan02" : "jili02", function () {
        this.btnClose.enabled = true;
        this.updateWheelItems();
    }.bind(this));
};

WheelController.prototype.leftClicked = function () {
    AudioHelper.playBtnSound();
    var self = this;
    if (this.isShowRewardedVideo()) {
        StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "zhuanpan01" : "jili01", function (rewarded) {
            if (rewarded) {
                self.startWheel();
            }
            self.updateWheelItems();
        });
    }
};

WheelController.prototype.spinAgainClicked = function () {
    AudioHelper.playBtnSound();
    var self = this;
    if (this.isShowRewardedVideo()) {
        StoreHelper.getInstance().checkAndShowRewardVideo("spin_again", function (rewarded) {
            if (rewarded) {
                self.startWheel();
            }
            self.updateWheelItems();
        });
    }
};

WheelController.prototype.rightClicked = function () {
    AudioHelper.playBtnSound();
    game.playerMan.setLastWheelTime(Date.now());
    this.updateWheelItems();
    this.btnRight.enabled = false;
    this.startWheel();
};

WheelController.prototype.closeClicked = function () {
    AudioHelper.playBtnSound();
    this.close();
};

WheelController.prototype.popup = function () {
    game.dialogManager.popup(this.rootNode, {popupAnim: true});
};

WheelController.prototype.close = function () {
    game.dialogManager.close(this.rootNode);
};

WheelController.createFromCCB = function() {
    //var ccbiName = game.utils.isSelfGame() ? "res/wheel/wheel_view.ccbi" : "res/wheel/wheel_view_new.ccbi";
    var ccbiName = "res/wheel/wheel_view.ccbi";
    var node = game.utils.loadNodeFromCCB(ccbiName, null, "WheelController", new WheelController());
    return node;
};

module.exports = WheelController;
},{"../../common/wheel/Wheel":36,"../config/ConfigMan":41,"../enum/BoostType":110,"../enum/WheelType":121,"../model/GameMan":124,"../model/StoreHelper":129}],98:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var Grid = cc.LayerColor.extend({

    col: 0,
    row: 0,

    editing: false,
    used: false,

    ctor: function (color, width, height, col, row) {
        this._super(color, width, height);
        this.ignoreAnchor = false;
        //this.type = type;
        this.col = col;
        this.row = row;
    },

    setColor: function (color) {
        this._super(color);
    }
});

module.exports = Grid;
},{}],99:[function(require,module,exports){
/**
 * Created by qinning on 2018/9/26
 **/
var ConfigMan = require("../../config/ConfigMan");

var EditorHelper = {
    /**
     * @type {CommonEvent}
     */
    CommonEvent: null,
    /**
     * @type {MapDisplayType}
     */
    MapDisplayType: null,
    /**
     * @type {EditorHttpConst}
     */
    EditorHttpConst: null,
    localServerPath: "http://localhost:8888",

    postData: function (url, callback, para) {
        url = this.localServerPath + url;
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = callback(xhttp);
        xhttp.open("POST", url, true);
        if (typeof para != "undifined") {
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhttp.send(para);
        }
        else {
            xhttp.send();
        }
    },

    saveLevelConfig: function (levelCfg) {
        var levelConfigs = ConfigMan.getInstance().originalLevelList;
        if (levelCfg.id > 0) {
            levelConfigs[levelCfg.id - 1] = levelCfg;
        } else {
            levelConfigs.push(levelCfg);
        }

        var results = '[\n';
        for (var i = 0; i < levelConfigs.length; ++i) {
            results += JSON.stringify(levelConfigs[i]);
            if (i !== levelConfigs.length - 1) {
                results += ",\n";
            } else {
                results += "\n";
            }
        }
        results += ']';

        this.postData("/save_level_configs", function(xhttp) {
            return function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    alert("save level config success");
                }
            };
        }, results);
    }
};

module.exports = EditorHelper;
},{"../../config/ConfigMan":41}],100:[function(require,module,exports){
var ConfigMan = require("../../config/ConfigMan");
var PlayerMan = require("../../model/PlayerMan");
var LevelConfig = require("../../config/LevelConfig");
var EditorHelper = require("../helper/EditorHelper");
//var AdsReminderController = require("../../controller/AdsReminderController");

var ColorConfigs = [
    cc.color(255, 251, 144),
    cc.color(255,246,14),
    cc.color(255,173,16),
    cc.color(255,118,44),
    cc.color(255,88,60),
    cc.color(175,83,32),
    cc.color(87,42,12),
    cc.color(255,175,157),
    cc.color(255,102,102),
    cc.color(255,53,53),
    cc.color(155,19,19),
    cc.color(162,255,0),
    cc.color(114,255,32),
    cc.color(21,255,109),
    cc.color(0,150,46),
    cc.color(0,255,216),
    cc.color(23,226,255),
    cc.color(45,144,255),
    cc.color(66,97,255),
    cc.color(106,87,255),
    cc.color(242,50,255),
    cc.color(174,69,255),
    cc.color(255,178,218),
    cc.color(255,118,173),
    cc.color(255,57,122),
    cc.color(189,4,126),
    cc.color(230,2,67),
    cc.color(169,0,72),
    cc.color(255,255,255),
    cc.color(20,20,20)
];

var GridType = {
    None: 0,
    Grid: 1,
    Wall: 2
}

var GrayColor = cc.color.GRAY;
var LightGrayColor = cc.color(130, 130, 130);
var StatusList = ["brick", "obstacle", "delete"];

var EditorScene = cc.Scene.extend({

    CONTENT_WIDTH: 600,
    CONTENT_HEIGHT: 600,

    COL: 50,
    ROW: 50,

    GRID_WIDTH: 9,
    GRID_HEIGHT: 9,

    GAP_WIDTH: 3,
    GAP_HEIGHT: 3,

    brickRects: null,

    obstacleRects: null,

    //_isBrick: true,
    _status: "brick",

    _brickItem: null,

    _levelEditBox: null,

    ctor: function () {
        game.playerMan = PlayerMan.getInstance();
        game.playerMan.initData();

        game.playerMan.setBoost(2, 400);
        game.playerMan.setBoost(3, 400);

        //var LogicMan = require("../../../common/model/LogicMan");
        //LogicMan.getInstance().startGame(true);
        //cc.BuilderReader.registerController("AdsReminderController", new AdsReminderController());

        this._super();

        var scale = 1.5;
        this.xOffset = (cc.winSize.width - this.CONTENT_WIDTH * scale) * 0.5;
        this.yOffset = (cc.winSize.height - this.CONTENT_HEIGHT * scale) * 0.5;

        this.brickRects = [];
        this.obstacleRects = [];

        this.currentRects = this.brickRects;
        this.selectColor = ColorConfigs[0];
        this.selectColorIndex = 0;

        this.gridNode = new cc.Node();
        this.addChild(this.gridNode);
        this.gridNode.x = this.xOffset;
        this.gridNode.y = this.yOffset;
        this.gridNode.scale = scale;

        this.initGrids();
        this.initButtons();
        this.initColorButtons();
        this.initEditBox();

        if (game.gameMan.levelCfg) {
            this.loadConfig(game.gameMan.levelCfg.originalConfig);
        }
    },

    initEditBox: function () {
        var xOffset = 200;
        this._levelEditBox = this.createEditBox("", "Input LevelId", cc.p(cc.winSize.width * 0.5 - xOffset, 100));
        this._boostEditBox = this.createEditBox("1", "Input Boost Probability", cc.p(cc.winSize.width * 0.5, 100));
        this._star3EditBox = this.createEditBox("90", "Input 3Star Time", cc.p(cc.winSize.width * 0.5 + xOffset, 100));
    },

    createEditBox: function (content, placeHolder, position) {
        var editBox = new cc.EditBox(cc.size(270, 100), new cc.Scale9Sprite("res/common/blank.png"),
            new cc.Scale9Sprite("res/common/blank.png"));
        editBox.setString(content);
        editBox.setPosition(position);
        editBox.setFontColor(cc.color(255, 255, 255));
        //editBox.setHintCo
        editBox.setPlaceholderFontColor(cc.color(255, 0, 0));
        editBox.setPlaceHolder(placeHolder);
        editBox.setDelegate(this);
        this.addChild(editBox);
        return editBox;
    },

    initButtons: function () {
        // Bugs Item
        var brickItem = new cc.MenuItemFont("Brick", this.onBrickTypeChange, this);
        var saveItem = new cc.MenuItemFont("Save", this.onSave, this);
        var deleteItem = new cc.MenuItemFont("Back", this.onDelete, this);
        //var refreshItem = new cc.MenuItemFont("Refresh", this.onRefresh, this);
        var addItem = new cc.MenuItemFont("Add", this.onAdd, this);
        var reduceItem = new cc.MenuItemFont("Reduce", this.onReduce, this);
        var loadItem = new cc.MenuItemFont("Load", this.onLoad, this);
        // var previewItem = new cc.MenuItemFont("Preview", this.onPreview, this);
        // var duplicateItem = new cc.MenuItemFont("Duplicate", this.onDuplicateCheck, this);
        // var reachItem = new cc.MenuItemFont("Reach", this.onReachTest, this);
        var nextItem = new cc.MenuItemFont("Next", this.onNext, this);
        var menu = new cc.Menu(brickItem, saveItem, deleteItem, addItem, reduceItem, loadItem, nextItem);


        menu.alignItemsHorizontally();
        this.addChild(menu);
        menu.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 20));
        this._brickItem = brickItem;

        this._gridLabel = new cc.LabelTTF("", "Arial", 40);
        this.addChild(this._gridLabel);

        this._gridLabel.setAnchorPoint(cc.p(0, 0.5));

        this._gridLabel.setPosition(cc.p(100, cc.winSize.height - 80));

        this._gridLabel.setString(this.COL + "x" + this.ROW);
    },

    initColorButtons: function () {

        var items = [];
        for (var i = 0; i < ColorConfigs.length; ++i) {
            var colorItem = new cc.MenuItemFont(" O ", this.onSelectColor, this);
            colorItem.setColor(ColorConfigs[i]);
            colorItem.setTag(i);
            items.push(colorItem);
        }
        var menu = new cc.Menu(items.slice(0, items.length / 2 + 1));
        menu.alignItemsHorizontally();
        menu.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 55));
        this.addChild(menu);

        var bottomMenu = new cc.Menu(items.slice(items.length / 2 + 1));
        bottomMenu.alignItemsHorizontally();
        bottomMenu.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 90));
        this.addChild(bottomMenu);
    },

    onLoad: function (sender) {
        var levelString = this._levelEditBox.getString();
        var levelId = parseInt(levelString);
        if (isNaN(levelId)) {
            alert("level id not found:" + levelString);
        } else {
            var levelConfig = ConfigMan.getInstance().getOriginalLevelConfig(levelId);
            if (!levelConfig) {
                alert("level id not found:" + levelString);
            } else {
                this.loadConfig(levelConfig);
            }
        }
    },

    onPreview: function (sender) {
        var obj = this.generateLevelObj();
        var levelConfig = new LevelConfig();
        levelConfig.unmarshal(obj);
        levelConfig.originalConfig = obj;
        game.gameMan.levelCfg = levelConfig;
        game.gameMan.status = this._status;
        //var scene = new GameScene();
        var GameScene = require("./GameScene");
        //cc.winSize.width = cc.winSize.height * 0.5;
        cc.director.runScene(new GameScene());
    },

    onDuplicateCheck: function (sender) {
        var originalLevelList = ConfigMan.getInstance().originalLevelList;
        var foundDuplicate = false;
        for (var i = 0; i < originalLevelList.length - 1; ++i) {
            for (var j = i + 1; j < originalLevelList.length; ++j) {
                var levelCfg1 = originalLevelList[i];
                var levelCfg2 = originalLevelList[j];
                if (this.isEqualLevelCfgs(levelCfg1, levelCfg2)) {
                    alert("found duplicate level:" + (i + 1) + " and " + (j + 1));
                    foundDuplicate = true;
                    break;
                }
            }
            if (foundDuplicate) {
                break;
            }
        }
        if (!foundDuplicate) {
            alert("all is ok");
        }
    },

    onReachTest: function (sender) {
        var levelList = ConfigMan.getInstance().levelList;
        //if (this.isLevelReachable(levelList[23])) {
        //    alert("all is ok");
        //} else {
        //    alert("unreachable level");
        //}
        var findUnReachable = false;
        for (var i = 0; i < levelList.length; ++i) {
            if (!this.isLevelReachable(levelList[i])) {
                findUnReachable = true;
                alert("find unreachable level:" + (i + 1));
                break;
            }
        }
        if (!findUnReachable) {
            alert("all is ok");
        }
    },

    onNext: function (sender) {
        var levelString = this._levelEditBox.getString();
        var levelId = parseInt(levelString);
        if (isNaN(levelId)) {
            alert("level id not found:" + levelString);
        } else {
            var levelConfig = ConfigMan.getInstance().getOriginalLevelConfig(levelId + 1);
            if (!levelConfig) {
                alert("level id not found:" + levelString);
            } else {
                this._levelEditBox.setString(levelId + 1);
                this.loadConfig(levelConfig);
            }
        }
    },

    isLevelReachable: function (levelCfg) {
        var grids = [];
        var i, j, brickCfg, x, y;
        for (i = 0; i < levelCfg.width; ++i) {
            grids[i] = [];
            for (j = 0; j < levelCfg.height; ++j) {
                grids[i][j] = {
                    type: GridType.None,
                    find: false
                };
            }
        }
        for (i = 0; i < levelCfg.bricks.length; ++i) {
            brickCfg = levelCfg.bricks[i];
            for (x = 0; x < brickCfg.width; ++x) {
                for (y = 0; y < brickCfg.height; ++y) {
                    grids[brickCfg.x + x][brickCfg.y + y] = {
                        type: GridType.Grid,
                        find: false
                    };
                }
            }
        }
        for (i = 0; i < levelCfg.obstacles.length; ++i) {
            brickCfg = levelCfg.obstacles[i];
            for (x = 0; x < brickCfg.width; ++x) {
                for (y = 0; y < brickCfg.height; ++y) {
                    grids[brickCfg.x + x][brickCfg.y + y] = {
                        type: GridType.Wall,
                        find: false
                    };
                }
            }
        }

        var findFirstGridPoss = this.findFirstGrids(levelCfg, grids);
        if (findFirstGridPoss.length === 0) {
            return false;
        }
        for (x = 0; x < findFirstGridPoss.length; ++x) {
            var firstGridPos = findFirstGridPoss[x];
            this.searchGrid(grids, levelCfg, firstGridPos.x, firstGridPos.y);
        }
        var findGrid = false;
        for (i = 0; i < grids.length; ++i) {
            for (j = 0; j < grids[i].length; ++j) {
                if (grids[i][j].type === GridType.Grid) {
                    findGrid = true;
                    break;
                }
            }
            if (findGrid) {
                break;
            }
        }
        if (findGrid) {
            return false;
        }
        return true;
    },

    findFirstGrids: function (levelCfg, grids) {
        var i;
        var results = [];
        for (i = 0; i < levelCfg.width; ++i) {
            if (grids[i][0].type !== GridType.Wall) {
                results.push(cc.p(i, 0));
            }
        }
        return results;
    },

    searchGrid: function (grids, levelCfg, x, y) {
        if (x >= 0 && x < levelCfg.width && y >= 0 && y < levelCfg.height) {
            var grid = grids[x][y];
            if (grid.type === GridType.Wall) {
                return;
            }
            if (grid.find) {
                return;
            }
            grid.find = true;
            if (grid.type === GridType.Grid) {
                grid.type = GridType.None;
            }
            this.searchGrid(grids, levelCfg, x - 1, y);
            this.searchGrid(grids, levelCfg, x + 1, y);
            this.searchGrid(grids, levelCfg, x, y + 1);
            this.searchGrid(grids, levelCfg, x, y - 1);
        }
    },

    isEqualLevelCfgs: function (levelCfg1, levelCfg2) {
        if (JSON.stringify(levelCfg1.bricks) === JSON.stringify(levelCfg2.bricks) &&
            JSON.stringify(levelCfg1.obstacles) === JSON.stringify(levelCfg2.obstacles)) {
            return true;
        }
        return false;
    },

    generateLevelObj: function () {
        var boostProbability = Number(this._boostEditBox.getString());
        if (isNaN(boostProbability)) {
            boostProbability = 1;
        }

        var starTime = Number(this._star3EditBox.getString());
        if (isNaN(starTime)) {
            starTime = 90;
        }

        var id = parseInt(this._levelEditBox.getString());
        if (isNaN(id)) {
            id = undefined;
        }

        var obj = {
            id: id,
            b: boostProbability,
            starTime: starTime,
            pixelWidth: this.CONTENT_WIDTH,
            pixelHeight: this.CONTENT_HEIGHT,
            width: this.COL,
            height: this.ROW,
            bricks: this.brickRects,
            obstacles: this.obstacleRects
        };
        return obj;
    },

    loadConfig: function (config) {
        this.resetOldView();

        this.CONTENT_WIDTH = config.pixelWidth;
        this.CONTENT_HEIGHT = config.pixelHeight;
        this.COL = config.width;
        this.ROW = config.height;
        this.brickRects = config.bricks;
        this.obstacleRects = config.obstacles;

        //this.updateView();
        var width = this.CONTENT_WIDTH / this.COL;
        var height = this.CONTENT_HEIGHT / this.ROW;
        this.GRID_WIDTH = width * 0.75;
        this.GRID_HEIGHT = height * 0.75;
        this.GAP_WIDTH = width - this.GRID_WIDTH;
        this.GAP_HEIGHT = height - this.GRID_HEIGHT;

        this.initGrids();

        //this.brickRects = [];
        //this.obstacleRects = [];
        //this.currentRects = this.brickRects;
        //this._isBrick = true;
        //this._status = "brick";
        //this._brickItem.setString("Brick");
        if (game.gameMan.status) {
            this._status = game.gameMan.status;
        }
        this.updateBrickType();
        this._gridLabel.setString(this.COL + "x" + this.ROW);

        for (var i = 0; i < this.brickRects.length; ++i) {
            var brickRect = this.brickRects[i];
            this.markOccupiedWithRect(brickRect, ColorConfigs[brickRect[4] - 1]);
        }
        for (var i = 0; i < this.obstacleRects.length; ++i) {
            var brickRect = this.obstacleRects[i];
            this.markOccupiedWithRect(brickRect,  cc.color(0,0,0));
        }
        this._levelEditBox.setString(config.id);
        this._boostEditBox.setString(config.b);
        this._star3EditBox.setString(config.starTime);
        //this.currentRects =
    },

    onSelectColor: function (sender) {
        this.selectColor = ColorConfigs[sender.getTag()];
        this.selectColorIndex = sender.getTag();
    },

    resetOldView: function () {
        this.forEachGrids(function (grid) {
            grid.removeFromParent();
        });
        this.grids = [];
    },

    updateView: function () {
        var width = this.CONTENT_WIDTH / this.COL;
        var height = this.CONTENT_HEIGHT / this.ROW;
        this.GRID_WIDTH = width * 0.75;
        this.GRID_HEIGHT = height * 0.75;
        this.GAP_WIDTH = width - this.GRID_WIDTH;
        this.GAP_HEIGHT = height - this.GRID_HEIGHT;

        this.initGrids();

        this.brickRects = [];
        this.obstacleRects = [];
        this.currentRects = this.brickRects;
        //this._isBrick = true;
        this._status = "brick";
        this._brickItem.setString("Brick");

        this._gridLabel.setString(this.COL + "x" + this.ROW);
    },

    onAdd: function () {
        this.resetOldView();
        this.COL += 2;
        this.ROW += 2;
        this.updateView();
    },

    onReduce: function () {
        this.resetOldView();
        this.COL -= 2;
        this.ROW -= 2;
        this.updateView();
    },


    onSave: function () {
        var obj = this.generateLevelObj();

        cc.log("results:" + JSON.stringify(obj));

        EditorHelper.saveLevelConfig(obj);
    },

    onDelete: function () {
        if (this._status !== "delete") {
            this.deleteLatestRect();
        }
    },

    onRefresh: function () {
        this.reset();
    },

    onBrickTypeChange: function () {
        this._status = StatusList[(StatusList.indexOf(this._status) + 1) % StatusList.length];
        //this._isBrick = !this._isBrick;
        this.updateBrickType();
    },

    updateBrickType: function () {
        this._brickItem.setString(this._status);
        if (this._status === "obstacle") {
            this.currentRects = this.obstacleRects;
        } else if (this._status === "brick") {
            this.currentRects = this.brickRects;
        } else {
            this.currentRects = null;
        }
    },

    initGrids: function () {
        this.grids = [];
        var Grid = require("../entity/Grid");
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            this.grids.push([]);
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                var grid = new Grid(LightGrayColor, this.GRID_WIDTH, this.GRID_HEIGHT, localCol, localRow);
                this.gridNode.addChild(grid);
                grid.setPosition(this.getGridPos(localCol, localRow));
                this.grids[localCol].push(grid);
                this.markGrayHint(grid, localCol, localRow);
                grid._color = grid.color;
            }
        }
    },

    markGrayHint: function (grid, localCol, localRow) {
        var grayColor = GrayColor;
        var isLeft = (this.COL / localCol) > 2;
        var isBottom = (this.ROW / localRow) > 2;
        if (localCol === Math.floor(this.COL / 2) ||
            localCol === Math.floor(this.COL / 2) - 1 ||
            localRow === Math.floor(this.ROW / 2) ||
            localRow === Math.floor(this.ROW / 2) - 1
        ) {
            grid.setColor(grayColor);
        }

        var iii = isLeft ? 4 : 0;

        if (localCol % 5 === iii) {
            grid.setColor(grayColor);
        }

        var jjj = isBottom ? 4 : 0;

        if (localRow % 5 === jjj) {
            grid.setColor(grayColor);
        }

        //iii = isLeft ? 9 : 0;
        //jjj = isBottom ? 9 : 0;
        //
        //if (localCol % 10 === iii && localRow % 10 === jjj) {
        //    grid.setColor(cc.color.YELLOW);
        //}
    },

    reset: function () {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                this.grids[localCol][localRow].editing = false;
                this.grids[localCol][localRow].setColor(LightGrayColor);
                this.grids[localCol][localRow].used = false;

                this.markGrayHint(this.grids[localCol][localRow], localCol, localRow);
            }
        }
        this.brickRects = [];
        this.obstacleRects = [];
        this.currentRects = this.brickRects;
        //this._isBrick = true;
        this._status = "brick";
        this._brickItem.setString("Brick");
    },

    onEnter:function () {
        this._super();
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan.bind(this),
            onTouchMoved: this.onTouchMoved.bind(this),
            onTouchEnded: this.onTouchEnded.bind(this),
            onTouchCancelled: this.onTouchCancelled.bind(this)
        }, this.gridNode);

        //cc.eventManager.addListener({
        //    event: cc.EventListener.KEYBOARD,
        //    onKeyReleased: function (keyCode, event) {
        //        if (keyCode === cc.KEY.backspace) {
        //            //cc.director.end();
        //            this.deleteLatestRect();
        //        }
        //    }.bind(this)
        //}, this);
    },

    onExit: function () {
        this._super();
    },

    getGridPos: function (localCol, localRow) {
        var gridSize = this.getGridSize();
        return cc.p((gridSize.width + this.GAP_WIDTH) * (localCol + 0.5),
            (gridSize.height + this.GAP_HEIGHT) * (localRow + 0.5));
    },

    getGridSize: function () {
        return cc.size(this.GRID_WIDTH, this.GRID_HEIGHT);
    },

    getFullGridSize: function () {
        return cc.size(this.GRID_WIDTH + this.GAP_WIDTH, this.GRID_HEIGHT + this.GAP_HEIGHT);
    },

    onTouchBegan:function(touch, event) {
        var grid = this.getClosestGrid(touch);
        if (!grid) {
            return false;
        }
        if (this._status === "delete") {
            this.firstGrid = grid;
            // grid.setColor(grid._color);
        } else {
            if (grid.used) {
                return false;
            }
            this.firstGrid = grid;
            grid.setColor(this.getCurrentColor());
        }
        return true;
    },

    onTouchMoved:function(touch, event) {
        if (this._status === "delete") {
            this.touchDelete(touch);
        } else {
            this.touchDraw(touch);
        }
        return true;
    },

    onTouchEnded:function(touch, event) {
        if (this._status === "delete") {
            this.touchDelete(touch);
        } else {
            this.touchDraw(touch);
        }

        if (this.firstGrid && this.lastGrid) {
            var region = this.getRegion(this.firstGrid, this.lastGrid);
            var index = this.selectColorIndex + 1;
            if (this._status !== "brick") {
                index = 0;
            }
            var rect = [region.minCol, region.minRow,
                region.maxCol - region.minCol + 1, region.maxRow - region.minRow + 1, index];
            var ccRect = cc.rect(rect[0], rect[1], rect[2], rect[3]);
            if (this._status === "delete") {
                this.deleteRectFromRects(ccRect, this.brickRects);
                this.deleteRectFromRects(ccRect, this.obstacleRects);
                this.forEachGrids(function (grid) {
                    grid.deleted = false;
                });
            } else {
                this.currentRects.push(rect);
                this.markOccupiedWithRect(rect, null);
                this.forEachGrids(function (grid) {
                    grid.editing = false;
                });
            }
        }

        this.firstGrid = null;
        this.lastGrid = null;
    },

    deleteRectFromRects: function (ccRect, rects) {
        for (var i = rects.length - 1; i >= 0; --i) {
            var brickRect = rects[i];
            var ccBrickRect = cc.rect(brickRect[0], brickRect[1], brickRect[2], brickRect[3]);
            var overlapsRect = cc.rectIntersection(ccRect, ccBrickRect);
            if (overlapsRect.width <= 0 || overlapsRect.height <= 0) {
                continue;
            }
            var resultRects = this.getOverlapsRects(overlapsRect, ccBrickRect);
            rects.splice(i, 1);
            for (var j = 0; j < resultRects.length; ++j) {
                rects.push(this.convertToJsonList(resultRects[j], brickRect[4]));
            }
        }
    },

    convertToJsonList: function (rect, color) {
        return [rect.x, rect.y, rect.width, rect.height, color];
    },

    getOverlapsRects: function (overlapsRect, brickRect) {
        var results = [
            cc.rect(brickRect.x, brickRect.y, brickRect.width, overlapsRect.y - brickRect.y),
            cc.rect(brickRect.x, cc.rectGetMaxY(overlapsRect), brickRect.width, cc.rectGetMaxY(brickRect) - cc.rectGetMaxY(overlapsRect)),
            cc.rect(brickRect.x, overlapsRect.y, overlapsRect.x - brickRect.x, overlapsRect.height),
            cc.rect(cc.rectGetMaxX(overlapsRect), overlapsRect.y, cc.rectGetMaxX(brickRect) - cc.rectGetMaxX(overlapsRect), overlapsRect.height)
        ];
        console.log("results:" + JSON.stringify(results));
        var rects = [];
        for (var i = results.length - 1; i >= 0; --i) {
            var rect = results[i];
            if (rect.width <= 0 || rect.height <= 0) {
                continue;
            }
            rects.push(rect);
        }
        return rects;
    },

    //markOccupied: function () {
    //    var region = this.getRegion(this.firstGrid, this.lastGrid);
    //
    //    for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
    //        for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
    //            this.grids[localCol][localRow].used = true;
    //        }
    //    }
    //},

    markOccupiedWithRect: function (rect, color) {
        for (var localCol = rect[0]; localCol < rect[0] + rect[2]; ++localCol) {
            for (var localRow = rect[1]; localRow < rect[1] + rect[3]; ++localRow) {
                if (this.grids[localCol]) {
                    this.grids[localCol][localRow].editing = false;
                    this.grids[localCol][localRow].used = true;
                    if (color) {
                        this.grids[localCol][localRow].setColor(color);
                    }
                } else {
                    console.log("error");
                }
            }
        }
    },

    isOccupied: function (grid) {
        var region = this.getRegion(this.firstGrid, grid);
        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                if (this.grids[localCol][localRow].used) {
                    return true;
                }
            }
        }
        return false;
    },

    touchDraw: function (touch) {
        if (!this.firstGrid) {
            return false;
        }
        var grid = this.getClosestGrid(touch);

        if (!grid) {
            return false;
        }

        if (grid === this.lastGrid) {
            return false;
        }

        if (this.isOccupied(grid)) {
            return false;
        }
        this.lastGrid = grid;
        this.clearRect();
        this.drawRect(grid);
        return true;
    },

    touchDelete: function (touch) {
       if (!this.firstGrid) {
           return false;
       }
       var grid = this.getClosestGrid(touch);

       if (!grid) {
           return false;
       }

       if (grid === this.lastGrid) {
           return false;
       }

       // if (this.isOccupied(grid)) {
       //     return false;
       // }
       this.lastGrid = grid;
       // this.clearRect();
       // this.drawRect(grid);
        this.drawDeleteRect(grid);
    },

    deleteLatestRect: function () {
        var rect = this.currentRects.pop();
        if (rect) {
            for (var localCol = rect[0]; localCol < rect[0] + rect[2]; ++localCol) {
                for (var localRow = rect[1]; localRow < rect[1] + rect[3]; ++localRow) {
                    var grid = this.grids[localCol][localRow];
                    grid.setColor(grid._color);
                    grid.used = false;
                }
            }
        }
    },

    clearRect: function () {
        this.forEachGrids(function (grid) {
            if (grid.editing && !grid.used) {
                grid.setColor(grid._color);
                grid.editing = false;
            }
        });
    },

    drawRect: function (grid) {
        var region = this.getRegion(this.firstGrid, grid);

        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                this.grids[localCol][localRow].editing = true;
                this.grids[localCol][localRow].setColor(this.getCurrentColor());
            }
        }
    },

    forEachGrids: function (cb) {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                var grid = this.grids[localCol][localRow];
                cb(grid);
            }
        }
    },

    drawDeleteRect: function (grid) {
        var region = this.getRegion(this.firstGrid, grid);

        this.forEachGrids(function (grid) {
            if (grid.deleted) {
                grid.setColor(grid._showColor);
                grid.deleted = false;
            }
        });

        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                var grid = this.grids[localCol][localRow];
                // grid.editing = false;
                grid.used = false;
                grid.deleted = true;
                grid._showColor = grid.getColor();
                grid.setColor(grid._color);
            }
        }
    },

    getRegion: function (grid1, grid2) {
        var minRow = Math.min(grid1.row, grid2.row);
        var maxRow = Math.max(grid1.row, grid2.row);
        var minCol = Math.min(grid1.col, grid2.col);
        var maxCol = Math.max(grid1.col, grid2.col);
        return {
            minRow: minRow,
            maxRow: maxRow,
            minCol: minCol,
            maxCol: maxCol
        };
    },

    onTouchCancelled:function(touch, event) {
    },

    getClosestGrid: function (touch) {
        var localPos = this.gridNode.convertToNodeSpace(touch.getLocation());
        var gridSize = this.getFullGridSize();

        cc.log("localPos:" + JSON.stringify(localPos));

        var row = Math.floor(localPos.x / gridSize.width);
        var col = Math.floor(localPos.y / gridSize.height);

        cc.log("row:" + row + ",col:" + col);

        if (this.grids[row]) {
            return this.grids[row][col];
        }
        return null;
    },

    getCurrentColor: function () {
        if (this._status === "brick") {
            return this.selectColor;
        } else {
            return cc.color(0,0,0);
        }
    }
    //
    //drawRect: function(region, color, clear) {
    //    if (clear){
    //        this._drawNode.clear();
    //    }
    //    if (region == null) {
    //        return;
    //    }
    //    var min = region.getMin();
    //    var max = region.getMax();
    //    max.x += 1;
    //    max.y += 1;
    //    this._drawNode.drawSegment(cc.p(min.x, min.y),
    //        cc.p(min.x, max.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(min.x, max.y),
    //        cc.p(max.x, max.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(max.x, max.y),
    //        cc.p(max.x, min.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(max.x, min.y),
    //        cc.p(min.x, min.y), 1, color);
    //},
    //
    //drawRectFill: function (region, color) {
    //    if (region == null) {
    //        return;
    //    }
    //    this._drawNode.drawRect(region.getMin(), region.getMax(), color, 1, color);
    //}
});

module.exports = EditorScene;
},{"../../config/ConfigMan":41,"../../config/LevelConfig":43,"../../model/PlayerMan":125,"../entity/Grid":98,"../helper/EditorHelper":99,"./GameScene":101}],101:[function(require,module,exports){
var GameController = require("../../controller/GameController");

var GameScene = cc.Scene.extend({

    ctor: function () {
        this._super();
        var gameNode = GameController.createFromCCB();
        this.addChild(gameNode);
    }
});

module.exports = GameScene;

},{"../../controller/GameController":61}],102:[function(require,module,exports){
var GridType = require("../enum/GridType");
var ShapeType = require("../enum/ShapeType");
var GameMan = require("../model/GameMan");
var ItemCategory = require("../enum/ItemCategory");

var Ball = cc.Node.extend({

    type: GridType.BALL,
    body: null,
    sprite: null,
    addScale: 1,
    ctor: function (width) {
        this._super();
        this.bodyWidth = width;
        var skinCfg = GameMan.getInstance().getCurrentSkinCfg();
        var image = skinCfg.image + ".png";
        var sprite = new cc.PhysicsSprite("#" + image);
        this.addScale = skinCfg.scale;
        this.addChild(sprite);
        this.sprite = sprite;
        this.reset(width);
    },

    reset: function (width) {
        this.sprite.scaleX = width / this.sprite.width * this.addScale;
        this.sprite.scaleY = width / this.sprite.width * this.addScale;
    },

    updateSkin: function () {
        var skinCfg = GameMan.getInstance().getCurrentSkinCfg();
        var image = skinCfg.image + ".png";
        this.sprite.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(image));
        this.addScale = skinCfg.scale;
        this.reset(this.bodyWidth);
    },

    onExit: function () {
        this._super();
        this.removeBody();
    },

    update: function (dt) {
    },

    setAngleVel: function (w) {
        this.body.setAngVel(-cc.radiansToDegrees(w));
    },

    getBodyAngle: function () {
        return -cc.radiansToDegrees(this.body.a);
    },

    initBody: function (space, pos) {
        this.space = space;
        var bodyWidth = this.bodyWidth - 2;
        var body = new cp.Body(1, cp.momentForCircle(1, 0, bodyWidth, cp.v(0, 0)));
        var shape = new cp.CircleShape(body, bodyWidth / 2, cp.v(0, 0));
        shape.setElasticity(1);
        shape.setFriction(0);
        this.space.addShape(shape);
        this.space.addBody(body);
        shape.setCollisionType(ShapeType.BALL);
        body.userData = this;
        this.body = body;
        this.shape = shape;
        this.body.setPos(pos);
        body.setAngVel(3);

        //this.update(0);
        if (cc.sys.isNative) {
            shape.setFilter({
                group: cp.NO_GROUP,
                categories: ItemCategory.Ball,
                mask: ItemCategory.Obstacle
            });
        } else {
            shape.group = 1;
        }
        this.sprite.setBody(body);
    },

    getPosition: function () {
        return this.sprite.getPosition();
    },

    removeBody: function () {
        //console.log("Ball removeBody");
        if (this.body) {
            this.space.removeBody(this.body);
            this.space.removeShape(this.shape);
            //this.sprite.setBody(null);
            this.body = null;
            this.shape = null;
        }
    },

    setVel: function (directionPos) {
        this.body.setVel(directionPos);
    },

    getVel: function () {
        return this.body.getVel();
    }
});

module.exports = Ball;
},{"../enum/GridType":112,"../enum/ItemCategory":113,"../enum/ShapeType":117,"../model/GameMan":124}],103:[function(require,module,exports){
/**
 * Created by qinning on 2017/11/8.
 */
var Utils = require("../../common/util/Utils");

var BallPool = {
    MAX_POOL_SIZE: 300,
    _poolSize: {},
    _pool: {},

    setMaxPoolSize: function (name, count) {
        this._poolSize[name] = count;
    },

    getMaxPoolSize: function (name) {
        return this._poolSize[name] || this.MAX_POOL_SIZE;
    },

    putInPool: function (name, obj) {
        if (!this._pool[name]) {
            this._pool[name] = [];
        }
        if (this._pool[name].length < this.getMaxPoolSize(name)) {
            obj.retain && obj.retain();
            this._pool[name].push(obj);
        } else {
            cc.log("Symbol pool is full, throw away this symbol:" + name + ",max pool size:" + this.getMaxPoolSize(name));
        }
    },

    hasObject: function (name) {
        return (this._pool[name] && this._pool[name].length > 0);
    },

    removeObject: function (name, obj) {
        var list = this._pool[name];
        if (list) {
            for (var i = 0; i < list.length; i++) {
                if (obj === list[i]) {
                    // JSB release to avoid memory leak
                    obj.release && obj.release();
                    list.splice(i, 1);
                }
            }
        }
    },

    getFromPool: function (name) {
        if (this.hasObject(name)) {
            var obj = this._pool[name].pop();
            cc.sys.isNative && obj.release && Utils.autoRelease(obj);
            return obj;
        }
    },

    drainAllPools: function () {
        for (var i in this._pool) {
            if (this._pool.hasOwnProperty(i)) {
                for (var j = 0; j < this._pool[i].length; j++) {
                    var obj = this._pool[i][j];
                    // JSB release to avoid memory leak
                    obj.release && obj.release();
                }
            }
        }
        this._pool = {};
    }
};

module.exports = BallPool;
},{"../../common/util/Utils":35}],104:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var GridType = require("../enum/GridType");
var BoardController = require("../controller/BoardController");
var ShapeType = require("../enum/ShapeType");
var ItemCategory = require("../enum/ItemCategory");

var Board = cc.Node.extend({

    type: GridType.BOARD,

    node: null,

    shape: null,

    ctor: function (width) {
        this._super();
        this.node = BoardController.createFromCCB(width);
        this.addChild(this.node);

        this.width = this.node.controller.ndBoard.width + 16;
        this.height = this.node.controller.ndBoard.height;
    },

    onExit: function () {
        this._super();
        this.removeBody();
    },

    removeBody: function () {
        //console.log("Board removeBody");
        if (this.body) {
            //this.space.removeBody(this.body);
            if (cc.sys.isNative) {
                this.space.removeShape(this.shape);
            } else {
                this.space.removeStaticShape(this.shape);
            }
            this.body = null;
            this.shape = null;
        }
    },

    initBody: function (space, pos) {
        this.setPosition(pos);
        this.space = space;

        var body;
        if (cc.sys.isNative) {
            body = new cp.Body(0, Infinity);
        } else {
            body = new cp.Body(Infinity, Infinity);
        }
        var shape = new cp.BoxShape(body, this.width, this.height);
        shape.setElasticity(1);
        shape.setFriction(0);
        shape.setCollisionType(ShapeType.BOARD);
        //shape.layers = 1;
        this.space.addStaticShape(shape);
        body.setPos(pos);
        body.userData = this;
        this.body = body;
        this.shape = shape;
        if (cc.sys.isNative) {
            shape.setFilter({
                group: cp.NO_GROUP,
                categories: ItemCategory.Obstacle,
                mask: ItemCategory.Ball
            });
        } else {
            this.space.reindexShape(this.shape);
        }
    },

    setPosX: function (posX) {
        this.x = posX;
        this.body.setPos(cc.p(this.x, this.y));
        if (!cc.sys.isNative) {
            this.space.reindexShape(this.shape);
        }
    },

    getBoundingBox: function () {
        return this.node.controller.ndBoard.getBoundingBoxToWorld();
    },

    hideBall: function () {
        this.node.controller.hideBall();
    },

    showBall: function () {
        this.node.controller.showBall();
    }
});

module.exports = Board;
},{"../controller/BoardController":54,"../enum/GridType":112,"../enum/ItemCategory":113,"../enum/ShapeType":117}],105:[function(require,module,exports){
var BoostType = require("../enum/BoostType");

var Boost = cc.Sprite.extend({

    type: 0,
    ctor: function (type) {
        this.type = type;
        switch (type) {
            case BoostType.LIFE:
                this._super("#icon_new_life.png");
                //this.setColor(cc.color.RED);
                break;
            case BoostType.SPLIT:
                this._super("#icon_3_multiple.png");
                //this.setColor(cc.color.BLUE);
                break;
            case BoostType.THREE_BALL:
                this._super("#icon_3_new.png");
                //this.setColor(cc.color.GREEN);
                break;
            case BoostType.BOMB:
                this._super("#icon_bomb.png");
                break;
        }
    }
});

module.exports = Boost;
},{"../enum/BoostType":110}],106:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var ShapeType = require("../enum/ShapeType");
var ItemCategory = require("../enum/ItemCategory");

var Grid = cc.Node.extend({

    isGift: false,
    type: 0,
    removeable: false,

    sprite: null,
    ctor: function (color, width, height, type) {
        this._super();
        this.ignoreAnchor = false;
        this.sprite = new cc.Sprite("#grid.png");
        this.addChild(this.sprite);
        this.reset(color, width, height, type);
    },

    reset: function (color, width, height, type) {
        this.type = type;
        this.sprite.scaleX = width / this.sprite.width;
        this.sprite.scaleY = height / this.sprite.height;
        this.sprite.setColor(color);
        this.width = width;
        this.height = height;
    },

    onExit: function () {
        this._super();
        this.removeBody();
    },

    setGift: function () {
        this.isGift = true;
        var spriteFrame = cc.spriteFrameCache.getSpriteFrame("grid_gift.png");
        this.sprite.setSpriteFrame(spriteFrame);
        this.sprite.setColor(cc.color.WHITE);
        this.sprite.scaleX = (this.width + 4) / this.sprite.width;
        this.sprite.scaleY = (this.height + 4) / this.sprite.height;
    },

    setColor: function (color) {
        this._super();
        if (!this.isGift) {
            this.sprite.setColor(color);
        }
    },

    initBody: function (space, pos) {
        this.setPosition(pos);
        this.space = space;

        var body = new cp.Body(Infinity, Infinity);
        var shape = new cp.BoxShape(body, this.width, this.height);
        shape.setElasticity(1);
        shape.setFriction(0);
        //shape.layers = 1;
        this.space.addStaticShape(shape);
        shape.setCollisionType(ShapeType.BRICK);
        body.setPos(pos);
        this.body = body;
        body.userData = this;
        this.shape = shape;
        this.space.reindexShape(shape);
        if (cc.sys.isNative) {
            shape.setFilter({
                group: cp.NO_GROUP,
                categories: ItemCategory.Obstacle,
                mask: ItemCategory.Ball
            });
        }
    },

    removeBody: function () {
        //console.log("Grid removeBody");
        if (this.shape) {
            if (cc.sys.isNative) {
                this.space.removeShape(this.shape);
            } else {
                this.space.removeStaticShape(this.shape);
            }
            this.shape = null;
            this.body = null;
            this.removeable = false;
        }
    }
});

module.exports = Grid;
},{"../enum/ItemCategory":113,"../enum/ShapeType":117}],107:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var Obstacle = cc.Node.extend({

    ctor: function (color, width, height) {
        this._super(color, width, height);
        this.ignoreAnchor = false;
        this.sprite = new cc.Sprite("#grid.png");
        this.addChild(this.sprite);
        this.reset(color, width, height);
    },

    reset: function (color, width, height) {
        this.sprite.scaleX = width / this.sprite.width;
        this.sprite.scaleY = height / this.sprite.height;
        this.width = width;
        this.height = height;
        this.sprite.setColor(color);
    },

    setColor: function (color) {
        this._super();
        this.sprite.setColor(color);
    }
});

module.exports = Obstacle;
},{}],108:[function(require,module,exports){
/**
 * Created by oye on 15-5-17.
 */
var BoostType = require("../enum/BoostType");

var PlayerInfo = function(){
    this.playerId = "";
    this.bestScore = 0;
    this.removedAds = false;
    this.level = 0;
    this.progress = 0;
    this.levelMap = null;
    this.rated = false;

    this.boostMap = null;
    this.coins = 0;
    this.guided = false;

    this.hardLevel = 0;
    this.lastWheelTime = 0;
    this.currentSkinId = 0;
    this.interstitialAdCount = 0;
    this.rewardedAdCount = 0;

    this.createDt = 0;

    this.levelsMap = {};

    this.lastLoginDay = 0;
    this.consecutiveLoginDays = 1;
    this.lastClaimDailyBonusDay = 0;
    this.nextDayTips = false;

    this.skinMap = {};
    this.skinAdsCountMap = {};
    this.specialOfferMap = {};

    this.diamonds = 0;

    this.taskMap = {};
    this.skinAdjusted = false;
    this.lastShowRateTime = 0;

    this.rewardAdCountPerDay = {};
    this.rewardAdRecordDay = 0;
    this.iapCount = 0;
    this.failCountMap = {};
    this.lastLoginTime = 0;
    this.hasAimItem = false;
    this.lastDailyDiamondTime = 0;
};

PlayerInfo.prototype.unmarshall = function (json) {
    this.playerId = json["playerId"];
    this.bestScore = json["bestScore"] || 0;
    this.removedAds = json["removedAds"] || false;
    this.level = json["level"] || 1;
    this.progress = json["progress"] || 0;
    this.levelMap = json["levelMap"] || {};
    this.rated = json["rated"] || false;
    this.coins = json["coins"] || 0;
    this.guided = json["guided"] || false;
    this.boostMap = json["boostMap"] || {};
    this.hardLevel = json["hardLevel"] || 1;
    this.lastWheelTime = json["lastWheelTime"] || 0;
    this.currentSkinId = json["currentSkinId"] || 0;
    this.interstitialAdCount = json["interstitialAdCount"] || 0;
    this.rewardedAdCount = json["rewardedAdCount"] || 0;
    this.createDt = json["createDt"] || Date.now();
    this.levelsMap = json["levelsMap"] || {};
    this.lastLoginDay = json["lastLoginDay"] || 0;
    this.consecutiveLoginDays = json["consecutiveLoginDays"] || 1;
    this.lastClaimDailyBonusDay = json["lastClaimDailyBonusDay"] || 0;
    this.nextDayTips = json["nextDayTips"] || false;
    this.skinMap = json["skinMap"] || {
        "0": true
    };
    this.skinAdsCountMap = json["skinAdsCountMap"] || {};
    this.specialOfferMap = json["specialOfferMap"] || {};
    this.diamonds = json["diamonds"] || 50;
    this.taskMap = json["taskMap"] || {};
    this.skinAdjusted = json["skinAdjusted"] || false;
    this.lastShowRateTime = json["lastShowRateTime"] || 0;
    this.rewardAdCountPerDay = json["rewardAdCountPerDay"] || 0;
    this.rewardAdRecordDay = json["rewardAdRecordDay"] || 0;
    this.iapCount = json["iapCount"] || 0;
    this.failCountMap = json["failCountMap"] || {};
    this.lastLoginTime = json["lastLoginTime"] || Date.now();
    this.hasAimItem = json["hasAimItem"] || false;
    this.lastDailyDiamondTime = json["lastDailyDiamondTime"] || 0;
};

PlayerInfo.createDefault = function () {
    var playerInfo = new PlayerInfo();
    playerInfo.hintsCount = 5;
    playerInfo.bestScore = 0;
    playerInfo.removedAds = false;
    playerInfo.level = 1;
    playerInfo.progress = 0;
    playerInfo.levelMap = {};
    playerInfo.rated = false;
    playerInfo.coins = 0;
    playerInfo.guided = false;
    playerInfo.boostMap = {};
    playerInfo.boostMap[BoostType.SPLIT] = 5;
    playerInfo.boostMap[BoostType.THREE_BALL] = 5;
    playerInfo.hardLevel = 1;
    playerInfo.lastWheelTime = 0;
    playerInfo.currentSkinId = 0;
    playerInfo.interstitialAdCount = 0;
    playerInfo.rewardedAdCount = 0;
    playerInfo.createDt = Date.now();
    playerInfo.levelsMap = {};
    playerInfo.dailyBonusDt = Date.now();
    playerInfo.lastLoginDay = 0;
    playerInfo.consecutiveLoginDays = 1;
    playerInfo.lastClaimDailyBonusDay = 0;
    playerInfo.nextDayTips = false;
    playerInfo.skinMap = {
        "0": true
    };
    playerInfo.skinAdsCountMap = {};
    playerInfo.specialOfferMap = {};
    playerInfo.diamonds = 50;
    playerInfo.taskMap = {};
    playerInfo.skinAdjusted = false;
    playerInfo.lastShowRateTime = 0;
    playerInfo.rewardAdCountPerDay = 0;
    playerInfo.rewardAdRecordDay = 0;
    playerInfo.iapCount = 0;
    playerInfo.failCountMap = {};
    playerInfo.lastLoginTime = Date.now();
    playerInfo.hasAimItem = false;
    playerInfo.lastDailyDiamondTime = 0;
    return playerInfo;
};

module.exports = PlayerInfo;

},{"../enum/BoostType":110}],109:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var ShapeType = require("../enum/ShapeType");
var ItemCategory = require("../enum/ItemCategory");

var Wall = cc.Node.extend({

    initBody: function (space, pos) {
        this.setPosition(pos);
        this.space = space;

        var body = new cp.Body(Infinity, Infinity);
        var shape = new cp.BoxShape(body, this.width, this.height);
        shape.setElasticity(1);
        shape.setFriction(0);
        //shape.layers = 1;
        this.space.addStaticShape(shape);
        shape.setCollisionType(ShapeType.WALL);
        body.setPos(cc.pAdd(pos, cc.p(this.width * 0.5, this.height * 0.5)));
        body.userData = this;
        this.space.reindexShape(shape);
        if (cc.sys.isNative) {
            shape.setFilter({
                group: cp.NO_GROUP,
                categories: ItemCategory.Obstacle,
                mask: ItemCategory.Ball
            });
        }
    }
});

module.exports = Wall;
},{"../enum/ItemCategory":113,"../enum/ShapeType":117}],110:[function(require,module,exports){

var BoostType = {
    LIFE: 1,
    THREE_BALL: 2,
    SPLIT: 3,
    GIFT: 4,
    SKIN: 5,
    DIAMOND: 6,
    BOMB: 7,
    AIM_ITEM: 8,
    NUM: 8
};

module.exports = BoostType;
},{}],111:[function(require,module,exports){
/**
 * Created by qinning on 2017/5/7.
 */

var GameMode = {
    GAME_MODE_ENDLESS: 0,
    GAME_MODE_LEVEL: 1
};

module.exports = GameMode;
},{}],112:[function(require,module,exports){

var GridType = {
    OBSTACLE: 0,
    BRICK: 1,
    BALL: 2,
    BOARD: 3
};

module.exports = GridType;
},{}],113:[function(require,module,exports){
/**
 * Created by qinning on 2019/2/25
 **/

var ItemCategory = {
    Ball: 1 << 0,
    Obstacle: 1 << 1,
    Wall: 1 << 2
};

module.exports = ItemCategory;
},{}],114:[function(require,module,exports){
/**
 * Created by qinning on 2017/3/25.
 */

var LockStatus = {
    LOCK_STATUS_LOCK: 0,
    LOCK_STATUS_UNLOCK: 1,
    LOCK_STATUS_DOING: 2
};

module.exports = LockStatus;
},{}],115:[function(require,module,exports){

var RankType = {
    Friends: 0,
    Group: 1,
    Global:2
};

module.exports = RankType;
},{}],116:[function(require,module,exports){
/**
 * Created by qinning on 2018/1/1.
 */


var SceneType = {
    NONE: -1,
    LOADING: 0,
    MENU: 1,
    PACKAGE: 2,
    LEVEL: 3,
    GAME: 4
};

module.exports = SceneType;
},{}],117:[function(require,module,exports){

var ShapeType = {
    BALL: 1,
    BRICK: 2,
    BOARD: 3,
    WALL: 4
};

module.exports = ShapeType;
},{}],118:[function(require,module,exports){

var SkinRewardType = {
    None: 0,
    LevelCount: 1,
    WatchAdCount: 2,
    WatchRewardAdCount: 3,
    Claimed: 4,
    Purchase: 5
};

module.exports = SkinRewardType;
},{}],119:[function(require,module,exports){
/**
 * Created by qinning on 2019/2/21
 **/

var SkinType = {
    WatchAds: 1,
    Diamonds: 2
};

module.exports = SkinType;
},{}],120:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/16.
 */

var StoreType = {
    FREE: 1,
    NEW_3: 2,
    SPLIT: 3,
    REMOVE_ADS: 4,
    RESTORE: 5,
    FIRST_PURCHASE: 6,
    NEW_AND_SPLIT: 7,
    DIAMOND: 8,
    SKIN: 9,
    AIM_ITEM: 10
};

module.exports = StoreType;
},{}],121:[function(require,module,exports){

var WheelType = {
    DailyBonus: 0,
    Box: 1
};

module.exports = WheelType;
},{}],122:[function(require,module,exports){
/**
 * Created by oye on 15/11/21.
 */

var EventsName = {
    EVENT_NAME_GAME_START: "event_name_start",
    EVENT_NAME_GAME_OVER: "event_name_game_over",
    EVENT_NAME_UPDATE_SCORE: "event_name_update_score",
    EVENT_NAME_UPDATE_LEFT_BULLET: "event_name_update_left_bullet",
    EVENT_NAME_UPDATE_BEST_SCORE: "event_name_update_best_score",
    EVENT_NAME_UPDATE_AUDIO: "event_name_update_audio",
    UPDATE_LEVEL: "update_level",
    COINS_UPDATE: "coins_update",
    REFRESH_BOOST: "refresh_boost",
    UPDATE_SKIN: "update_skin",
    UPDATE_SPECIAL_OFFER: "update_special_offer",
    PURCHASE_END: "purchase_end",
    DIALOG_POPED: "dialog_poped",
    DIALOG_CLOSED: "dialog_closed",
    DIAMONDS_UPDATE: "diamonds_update",
    TASK_UPDATE: "task_update",
    REWARDED_VIDEO_COUNT: "rewarded_video_count",
    UPDATE_AIM_ITEM: "update_aim_item",
    SHOW_AIM_GUIDE: "show_aim_guide"
};

module.exports = EventsName;
},{}],123:[function(require,module,exports){
var AdsPlace = require("../../common/enum/AdsPlace");

var AdsHelper = cc.Class.extend({

    ctor: function () {
    },

    showPassAds: function () {
        if (game.gameMan.getMaxLevel() >= game.adsManager.startLevelLimit) {
            game.adsManager.showInterstitial(AdsPlace.Pass);
        }
    },

    showBackgroundAds: function () {
        if (game.gameMan.getMaxLevel() >= game.adsManager.startLevelLimit) {
            game.adsManager.showInterstitial(AdsPlace.BackGround);
        }
    },

    showBackHomeAds: function () {
        if (game.gameMan.getMaxLevel() >= game.adsManager.startLevelLimit) {
            game.adsManager.showInterstitial(AdsPlace.Home);
        }
    },

    showRefreshAds: function () {
        if (game.gameMan.getMaxLevel() >= game.adsManager.startLevelLimit) {
            game.adsManager.showInterstitial(AdsPlace.Refresh);
        }
    }

    // onEnterBackground: function () {
    //     game.adsManager.setInterstitialShowed(AdsPlace.BackGround);
    // }
});

AdsHelper.sharedDirector = null;
AdsHelper.firstUseDirector = true;

AdsHelper.getInstance = function () {
    if (AdsHelper.firstUseDirector) {
        AdsHelper.firstUseDirector = false;
        AdsHelper.sharedDirector = new AdsHelper();
    }
    return AdsHelper.sharedDirector;
};

module.exports = AdsHelper;
},{"../../common/enum/AdsPlace":10}],124:[function(require,module,exports){
/**
 * Created by qinning on 15/5/12.
 */
var EventsName = require("../events/EventsName");
var ConfigMan = require("../config/ConfigMan");
var AdsPlace = require("../../common/enum/AdsPlace");
var StoreHelper = require("../model/StoreHelper");
//var ShareConfig = require("../config/ShareConfig");
//var ConfigMan = require("../config/ConfigMan");

//var BoostProbabilityMap = {
//
//};

var GameMan = cc.Class.extend({
    FREE_WHEEL_HOURS: 12,

    ONE_HOUR_SECONDS: 60 * 60 * 1000,
    startTime: 0,
    resultCount: 0,
    rated: false,
    endTime: 0,
    canReLife: true,
    distance: 0,
    levelId: 1,
    hardMode: false,
    giftCount: 0,
    lastShowLevel: 0,

    totalFailCount: 0,
    poped3StarTips: false,
    firstEnterAdShowed: false,

    isTryAimItem: false,
    watchAdsMap: null,

    canUseAimItem: function () {
        var purchasedAimItem = game.playerMan.player.hasAimItem;
        var tryAimItem = this.isTryAimItem;
        return purchasedAimItem || tryAimItem;
    },

    canTryAimItem: function () {
        var isLevelOK = game.playerMan.getLevel() >= 10;
        var purchasedAimItem = game.playerMan.player.hasAimItem;
        return isLevelOK && !purchasedAimItem;
    },

    tryAimItem: function () {
        this.isTryAimItem = true;
        game.eventDispatcher.dispatchEvent(EventsName.SHOW_AIM_GUIDE);
    },

    resetTryAnimItem: function () {
        this.isTryAimItem = false;
    },

    getBoostProbability: function (config) {
        var failCount = game.playerMan.getFailCount(config.levelId);
        var boostProbability = config.boostProbability;
        if (failCount === 4) {
            return boostProbability + 0.2;
        } else if (failCount === 5) {
            return boostProbability + 0.4;
        } else if (failCount > 5) {
            return boostProbability + 0.5;
        }
        return boostProbability;
    },

    setHardMode: function (hardMode) {
        this.hardMode = hardMode;
    },

    canPop3StarTips: function () {
        return !this.poped3StarTips;
    },

    setPop3StarTips: function () {
        this.poped3StarTips = true;
    },

    isHardMode: function () {
        return this.hardMode;
    },

    getPlayerLevel: function () {
        if (this.isHardMode()) {
            return game.playerMan.getHardLevel();
        } else {
            return game.playerMan.getLevel();
        }
    },

    ctor: function () {
        this.watchAdsMap = {
            skin: {
                count: 0,
                callback: this.checkWatchAdsGetSkin.bind(this)
            },
            card: {
                count: 0,
                callback: this.checkWatchAdsFlipCard.bind(this)
            },
            box: {
                count: 0,
                callback: this.checkWatchAdsOpenBox.bind(this)
            }
        };
        this.watchAdsList = [];
        for (var key in this.watchAdsMap) {
            if (this.watchAdsMap.hasOwnProperty(key)) {
                this.watchAdsList.push(this.watchAdsMap[key]);
            }
        }
    },

    init: function () {
        this.rated = game.playerMan.player.rated;
        this.chooseLatestLevel();
    },

    chooseLatestLevel: function () {
        if (this.isHardMode()) {
            if (game.playerMan.getHardLevel() <= this.getLevelList().length) {
                this.levelId = game.playerMan.getHardLevel();
                return true;
            }
        } else {
            if (game.playerMan.getLevel() <= this.getLevelList().length) {
                this.levelId = game.playerMan.getLevel();
                return true;
            } else {
                this.setHardMode(true);
                if (game.playerMan.getHardLevel() <= this.getLevelList().length) {
                    this.levelId = game.playerMan.getHardLevel();
                    return true;
                }
            }
        }
        return false;
    },

    getLevelList: function () {
        return ConfigMan.getInstance().getLevelList();
    },

    updateScore: function () {
        game.eventDispatcher.dispatchEvent(EventsName.EVENT_NAME_UPDATE_SCORE);
    },

    //gameOver: function () {
    //    //game.analyseManager.trackFailedProgressionEvent("level", game.playerMan.getLevel());
    //    this.resultCount++;
    //},

    getMissionKey: function () {
        if (!this.isHardMode()) {
            return "normal_level_" + this.levelId;
        } else {
            return "hard_level_" + this.levelId;
        }
    },

    onGameStart: function () {
        game.analyseManager.missionBegan(this.getMissionKey());
    },

    getCurrentStar: function (costTime) {
        //cc.log("costTime:" + costTime);
        var levelCfg = this.getCurConfig();
        var star = 1;
        if (costTime <= levelCfg.starTime) {
            star = 3;
        } else if (costTime <= levelCfg.starTime * 2) {
            star = 2;
        }
        return star;
    },

    getProgressPercent: function (costTime) {
        var levelCfg = this.getCurConfig();
        return Math.max(0, 1 - (costTime / levelCfg.starTime / 3)) * 100;
    },

    getCurrentRewardDiamonds: function () {
        if (this.isNewStarData || this.lastStar === 0) {
            var lastRewardDiamonds = game.config.rewardDiamondMap[this.lastStar] || 0;
            var currentRewardDiamonds = game.config.rewardDiamondMap[this.currentStar] || 0;
            return Math.max(currentRewardDiamonds - lastRewardDiamonds, 0);
        }
        return 0;
    },

    hasStarTag: function () {
        var hasStarTag = false;
        if (!this.isHardMode()) {
            hasStarTag = game.playerMan.getLevelData(this.levelId, "starTag") || false;
        } else {
            hasStarTag = game.playerMan.getLevelData(this.levelId, "hardStarTag") || false;
        }
        return hasStarTag;
    },

    onWatchAdsGet3Star: function (levelId) {
        var star = 3;
        if (!this.isHardMode()) {
            this.updateLevelStar(levelId, star);
        } else {
            this.updateHardLevelStar(levelId, star);
        }
        this.currentStar = 3;
    },

    gameWin: function (costTime) {
        if (!this.isHardMode()) {
            this.lastStar = game.playerMan.getLevelStar(this.levelId);
        } else {
            this.lastStar = game.playerMan.getHardLevelStar(this.levelId);
        }

        game.analyseManager.missionCompleted(this.getMissionKey());

        this.isNewStarData = this.hasStarTag();

        var star = this.getCurrentStar(costTime);

        //this.onGameWin(star);
        this.currentStar = star;
        var hasPssed = false;
        var levelIdAndStar = this.levelId + "-" + star;
        if (!this.isHardMode()) {
            if (game.playerMan.getLevelStar(this.levelId) > 0) {
                hasPssed = true;
            }
            this.updateLevelStar(this.levelId, star);
            if (!hasPssed) {
                game.analyseManager.trackEvent("level_pass", {
                    "level": this.levelId
                });
                game.analyseManager.trackEvent("level_pass_star", {
                    "level": levelIdAndStar
                });
                cc.log("track event level_pass:" + this.levelId);
            }
            this.resultCount++;
            this.levelId++;
            if (this.levelId <= this.getLevelList().length) {
                game.gcManager.reportScore(this.levelId, game.config.getLeaderBoardKey());
            }
            game.playerMan.setLevel(this.levelId);
        } else {
            if (game.playerMan.getHardLevelStar(this.levelId) > 0) {
                hasPssed = true;
            }
            this.updateHardLevelStar(this.levelId, star);
            if (!hasPssed) {
                game.analyseManager.trackEvent("level_pass_hard", {
                    "level": this.levelId
                });
                game.analyseManager.trackEvent("level_pass_hard_star", {
                    levelStarKey: levelIdAndStar
                });
                cc.log("track event level_pass_hard:" + this.levelId);
            }
            this.resultCount++;
            this.levelId++;
            if (this.levelId <= this.getLevelList().length) {
                game.gcManager.reportScore(this.levelId, game.config.getHardBoardKey());
            }
            game.playerMan.setHardLevel(this.levelId);
        }
        game.gcManager.reportScore(this.getTotalStarCount(), game.config.getStarLeaderBoardKey());
        this.hasPassed = hasPssed;
    },

    skipLevel: function () {
        if (!this.isHardMode()) {
            this.levelId++;
            if (this.levelId <= this.getLevelList().length) {
                game.playerMan.setLevel(this.levelId);
            }
        } else {
            this.levelId++;
            if (this.levelId <= this.getLevelList().length) {
                game.playerMan.setHardLevel(this.levelId);
            }
        }
    },

    updateLevelStar: function (level, star) {
        var oldStar = game.playerMan.getLevelData(this.levelId, "star") || 0;
        if (star > oldStar) {
            cc.log("updateLevelStar:oldStar:" + oldStar + ",star:" + star);
            game.playerMan.updateLevelData(level, "star", star);
            game.playerMan.updateLevelData(level, "starTag", true);
        }
    },

    updateHardLevelStar: function (level, star) {
        var oldStar = game.playerMan.getLevelData(this.levelId, "hardStar") || 0;
        if (star > oldStar) {
            cc.log("updateHardLevelStar:oldStar:" + oldStar + ",star:" + star);
            game.playerMan.updateLevelData(level, "hardStar", star);
            game.playerMan.updateLevelData(level, "hardStarTag", true);
        }
    },

    resumeGame: function () {
        this.levelId--;
    },

    chooseLevel: function (levelId) {
        this.levelId = levelId;
    },

    getDisplayLevel: function () {
        return this.levelId;
    },

    getCurConfig: function () {
        var levelList = this.getLevelList();
        if (levelList) {
            return levelList[this.levelId - 1];
        }
        return null;
    },

    hasNextLevel: function () {
        var levelList = this.getLevelList();
        if (this.levelId > levelList.length) {
            return false;
        }
        return true;
    },

    onGameFail: function () {
        this.totalFailCount++;
        this.addFailCount();
        game.analyseManager.missionFailed(this.getMissionKey(), "normal_fail");
    },

    addFailCount: function () {
        game.playerMan.addFailCount(this.levelId);
    },

    // showAds: function (success) {
    //     cc.log("GameMan showAds:" + success + ",isNewPlayer:" + game.playerMan.isNewPlayer());
    //     this._showInterstitialAds();
    // },
    //
    // _showInterstitialAds: function () {
    //     if (this.getMaxLevel() >= game.adsManager.startLevelLimit) {
    //         var AdsPlace = require("../../common/enum/AdsPlace");
    //         game.adsManager.showInterstitial(AdsPlace.Pass);
    //     }
    // },

    showRegisterNotification: function () {
        if (this.resultCount > 0 && this.resultCount % 3 === 0) {
            game.logicMan.registerNotification();
        }
    },

    showRate: function () {
        var count = 4;
        var canShowRate = false;
        var lastShowedRateDay;
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            //Android 2天显示一次rate
            count = 5;
            lastShowedRateDay = Math.floor((Date.now() - game.playerMan.player.lastShowRateTime) / (24 * 3600 * 1000));
            canShowRate = lastShowedRateDay >= 2;
        } else {
            //iOS 6个小时显示一次rate
            lastShowedRateDay = Math.floor((Date.now() - game.playerMan.player.lastShowRateTime) / (3600 * 1000));
            canShowRate = lastShowedRateDay >= 6;
        }
        if (!this.rated && (this.resultCount > 0 && this.resultCount % count === 0) && canShowRate) {
            if (!game.rateManager.launchAppReview()) {
                game.popupMan.popupRateDlg(function () {
                    this.rated = true;
                    game.playerMan.setRated(true);
                }.bind(this), function () {
                    this.rated = true;
                    //this.showAds(success);
                }.bind(this));
            } else {
                this.rated = true;
            }
            game.playerMan.setLastShowRateTime();
            return true;
        } else {
            //this.showAds(success);
            return false;
        }
    },

    restartGame: function () {
        game.logicMan.registerNotification();
        this.startGame();
        game.eventDispatcher.dispatchEvent(EventsName.EVENT_NAME_UPDATE_SCORE);
        game.eventDispatcher.dispatchEvent(EventsName.EVENT_NAME_UPDATE_BG_SPRITE);
    },

    startGame: function () {
        //game.analyseManager.trackStartProgressionEvent("level", game.playerMan.getLevel());
    },

    enterGame: function () {
        //game.analyseManager.trackStartProgressionEvent("level", game.playerMan.getLevel());
    },

    leaveGame: function () {
        this.startTime = 0;
        this.distance = 0;
    },

    canShowRewardedVideo: function () {
        return (this.canReLife && game.adsManager.isRewardVideoReady());
    },

    getShareConfig: function () {
        var shareList = ConfigMan.getInstance().getShareList();
        var randomNum = game.utils.randomNextInt(shareList.length);
        return shareList[randomNum];
    },

    getFriendHelpShare: function () {
        var desc = game.utils.sprintf("砖块破坏者我已经%d关了，帮我继续玩，让我冲上榜首。", game.playerMan.getLevel());
        var shareConfig = this.getShareConfig();
        var share = shareConfig.copy();
        share.desc = desc;
        return share;
    },

    getFriendChallengeShare: function () {
        var desc = game.utils.sprintf("砖块破坏者我已经%d关了，你能超越我吗？", game.playerMan.getLevel());
        var shareConfig = this.getShareConfig();
        var share = shareConfig.copy();
        share.desc = desc;
        return share;
    },

    getWheelLeftTime: function () {
        var lastWheelTime = game.playerMan.getLastWheelTime();
        return (lastWheelTime + this.FREE_WHEEL_HOURS * this.ONE_HOUR_SECONDS - Date.now());
    },

    isFreeWheel: function () {
        var leftTime = this.getWheelLeftTime();
        if (leftTime <= 0) {
            return true;
        }
        return false;
    },

    // addGiftCount: function () {
    //     this.giftCount++;
    // },
    //
    // canShowGift: function () {
    //     return false;
    //     if (this.levelId >= 9) {
    //         if (this.levelId % 3 === 0) {
    //             if (this.giftCount < 3) {
    //                 this.lastShowLevel = this.levelId;
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // },

    getCurrentSkinCfg: function () {
        var currentSkinId = game.playerMan.getCurrentSkinId();
        var skinCfg = ConfigMan.getInstance().getSkinCfg(currentSkinId);
        return skinCfg;
    },

    updateSkin: function (sprite) {
        var skinCfg = this.getCurrentSkinCfg();
        var spriteFrame = cc.spriteFrameCache.getSpriteFrame(skinCfg.image + ".png");
        if (spriteFrame) {
            sprite.setSpriteFrame(spriteFrame);
        } else {
            var defaultSpriteFrame = cc.spriteFrameCache.getSpriteFrame("skin_0.png");
            sprite.setSpriteFrame(defaultSpriteFrame);
        }
    },

    checkAutoPopup: function (firstEnter) {
        if (!this.checkDailyBonus()) {
            if (!this.checkWheel()) {
                if (!this.checkWatchAdsGetDiamonds()) {
                    if (!this.checkSpecialOffer()) {
                        if (!firstEnter) {
                            //第二天奖励tips
                            if (!this.checkNextDayTip()) {
                                //看广告获得钻石
                                if (!this.checkWatchAdsGetDiamonds()) {
                                    //看广告获得皮肤
                                    if (!this.checkWatchAdsGetSkin()) {
                                        //看广告打开宝箱
                                        this.checkWatchAdsOpenBox();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    checkNextDayTip: function () {
        if (this.resultCount >= 3) {
            if (!game.playerMan.player.nextDayTips) {
                //game.popupMan.popupCommonDlg(_("next_day_tips"));
                game.popupMan.popupRewardDlg(_("next_day_tips"),
                    function () {
                    }, "icon_gifts.png", 1);
                game.playerMan.setNextDayTips();
                return true;
            }
        }
        return false;
    },

    checkDailyBonus: function () {
        var lastClaimDay = game.playerMan.player.lastClaimDailyBonusDay;
        var currentDayClaimed = lastClaimDay >= game.utils.getDayByTs(Date.now());
        if (!currentDayClaimed) {
            cc.log("game.popupMan.popupDailyBonus");
            game.popupMan.popupDailyBonus();
            return true;
        }
        return false;
    },

    checkSpecialOffer: function () {
        if (this.isSpecialOfferPurchased()) {
            return false;
        }
        if (!this.showedSpecialOffer) {
            this.showedSpecialOffer = true;
            game.popupMan.popupSpeicialOffer();
            return true;
        }
        return false;
    },

    checkWheel: function () {
        if (!this.showedWheel) {
            this.showedWheel = true;
            var leftTime = GameMan.getInstance().getWheelLeftTime();
            if (leftTime <= 0) {
                var WheelType = require("../enum/WheelType");
                game.popupMan.popupWheelDlg(WheelType.DailyBonus);
                return true;
            }
        }
        return false;
    },

    isSpecialOfferPurchased: function () {
        var specialOffer = ConfigMan.getInstance().getSpecialOfferCfg();
        var purchased = game.playerMan.isSpecialOfferPurchased(specialOffer.pid);
        cc.log("isSpecialOfferPurchased:" + purchased);
        return purchased;
    },

    checkRemoteConfig: function () {
        if (game.utils.isAndroidAndSelfGame()) {
            return;
        }
        var self = this;
        game.remoteConfig.setRemoteConfigReceivedCallback(function () {
            //reload config.
            cc.log("config man onRemoteConfigReceived");
            ConfigMan.getInstance().onRemoteConfigReceived();
            game.adsManager.onRemoteConfigReceived();
            self.logABTest("ads_config_group");
            self.logABTest("level_config_group");
        });
        game.remoteConfig.fetchRemoteConfig();
    },

    logABTest: function (name) {
        var group = game.remoteConfig.getRemoteConfig(name);
        if (!group) {
            group = "a";
        }
        game.analyseManager.trackEvent(name, {
            "group": group
        });
    },

    adjustSkinConfigs: function () {
        //if (game.playerMan.player.skinAdjusted) {
        //    return;
        //}
        //game.playerMan.setSkinAdjusted();
        //var oldTaskConfigs = ConfigMan.getInstance().getOldTaskList();
        //for (var i = 0; i < oldTaskConfigs.length; ++i) {
        //    var oldTaskConfig = oldTaskConfigs[i];
        //    this.adjustOldTaskConfig(oldTaskConfig);
        //}
    },

    adjustOldTaskConfig: function (data) {
        var SkinRewardType = require("../enum/SkinRewardType");
        var completed = false;
        switch (data.type) {
            case SkinRewardType.None:
                completed = true;
                break;
            case SkinRewardType.LevelCount:
                if (game.playerMan.getLevel() >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.WatchAdCount:
                if (game.playerMan.player.interstitialAdCount >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.WatchRewardAdCount:
                if (game.playerMan.player.rewardedAdCount >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.Claimed:
                if (game.playerMan.hasSkin(data.id)) {
                    completed = true;
                }
                break;
            case SkinRewardType.Purchase:
                if (game.playerMan.hasSkin(data.id)) {
                    completed = true;
                }
                break;
        }

        if (completed) {
            game.playerMan.setClaimedSkin(data.id);
            game.playerMan.setTaskClaimed(data.id);
        }
    },

    hasCompletedTask: function () {
        var taskConfigs = ConfigMan.getInstance().getTaskList();
        for (var i = 0; i < taskConfigs.length; ++i) {
            var taskConfig = taskConfigs[i];
            if (game.playerMan.isTaskClaimed(taskConfig.id)) {
                continue;
            }
            if (this.isTaskCompleted(taskConfig)) {
                return true;
            }
        }
        return false;
    },

    isTaskCompleted: function (data) {
        var SkinRewardType = require("../enum/SkinRewardType");
        var completed = false;
        switch (data.type) {
            case SkinRewardType.None:
                completed = true;
                break;
            case SkinRewardType.LevelCount:
                if (game.playerMan.getLevel() >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.WatchAdCount:
                if (game.playerMan.player.interstitialAdCount >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.WatchRewardAdCount:
                if (game.playerMan.player.rewardedAdCount >= data.count) {
                    completed = true;
                }
                break;
            case SkinRewardType.Claimed:
                if (game.playerMan.hasSkin(data.id)) {
                    completed = true;
                }
                break;
            case SkinRewardType.Purchase:
                if (game.playerMan.hasSkin(data.id)) {
                    completed = true;
                }
                break;
        }
        return completed;
    },

    canSkip: function () {
        var failCount = game.playerMan.getFailCount(this.levelId);
        cc.log("skip fail count:" + failCount);
        if (failCount <= 3) {
            return false;
        } else {
            return true;
        }
    },

    showFirstEnterHomeAd: function () {
        if (this.firstEnterAdShowed) {
            return;
        }
        this.firstEnterAdShowed = true;
        //cc.log("first enter ads 1");
        if (game.playerMan.getLevel() >= 4) {
            //cc.log("first enter ads 2");
            if (game.adsManager.showFirstEnterAd) {
                //cc.log("first enter ads 3: register day:" + game.adsManager.getRegisterDay());
                if (game.adsManager.getRegisterDay() >= game.adsManager.firstEnterShowAdDay) {
                    //cc.log("first enter ads 4");
                    var lastLoginDay = game.utils.getDayByTs(game.playerMan.player.lastLoginTime);
                    var currentDay = game.utils.getDayByTs(Date.now());
                    if (lastLoginDay === currentDay) {
                        //cc.log("first enter ads 5");
                        if (currentDay - lastLoginDay >= 5 * 1000) {
                            //cc.log("first enter ads 6");
                            game.adsManager.showInterstitial(AdsPlace.FirstEnter);
                        }
                    }
                }
            }
        }
        game.playerMan.setLastLoginTime();
    },

    checkWatchAdsGetSkin: function () {
        if (this.watchAdsMap.skin.count >= game.adsManager.skinMaxPopCount) {
            return false;
        }
        var SkinType = require("../enum/SkinType");
        var skinList = ConfigMan.getInstance().getSkinListByType(SkinType.WatchAds);
        var suitableSkinList = [];
        var skinCfg;
        var leftWatchAdsCountEqual1;
        for (var i = 0; i < skinList.length; ++i) {
            skinCfg = skinList[i];
            var owned = game.playerMan.hasSkin(skinCfg.id);
            var isWatchAdsType = (skinCfg.type === SkinType.WatchAds);
            if (isWatchAdsType) {
                leftWatchAdsCountEqual1 = (skinCfg.count - game.playerMan.getSkinAdsCount(skinCfg.id)) === 1;
            }
            if (!owned && isWatchAdsType && leftWatchAdsCountEqual1) {
                suitableSkinList.push(skinCfg);
            }
        }
        if (suitableSkinList.length <= 0) {
            return false;
        }
        var randomIndex = game.utils.randomNextInt(suitableSkinList.length);
        skinCfg = suitableSkinList[randomIndex];
        if (skinCfg) {
            game.popupMan.popupWatchAdsGetSkin(skinCfg);
            this.watchAdsMap.skin.count++;
            return true;
        }
        return false;
    },

    lastPopCount: 0,
    currentStep: 2,
    //0 mean still can pop, >0 mean stop pop.
    allPopedResult: 0,

    tryShowPassPopup: function () {
        var poped = false;
        if (this.levelId > game.adsManager.popupLevelLimit && this.resultCount > 0) {
            if (this.resultCount - this.lastPopCount >= this.currentStep) {
                this.lastPopCount = this.resultCount;
                poped = this.checkMinPopDialog();
            }
            this.tryResetPopCount();
        }
        return poped;
    },

    tryResetPopCount: function () {
        if (this.allPopedResult > 0 && this.resultCount - this.allPopedResult > game.adsManager.popupResetLimit) {
            this.allPopedResult = 0;
            for (var i = 0; i < this.watchAdsList.length; ++i) {
                var item = this.watchAdsList[i];
                item.count = 0;
            }
        }
    },

    checkMinPopDialog: function () {
        this.watchAdsList.sort(function (a, b) {
           return (a.count - b.count);
        });
        for (var i = 0; i < this.watchAdsList.length; ++i) {
            var item = this.watchAdsList[i];
            if (item.callback()) {
                return true;
            }
        }

        if (this.allPopedResult === 0) {
            this.allPopedResult = this.resultCount;
        }
        return false;
    },

    tryShowFailPopup: function () {
        if (this.levelId > game.adsManager.popupLevelLimit && this.totalFailCount > 0 && this.totalFailCount % 2 === 0) {
            if (!this.checkWatchAdsGetDiamonds()) {
                if (!this.checkWatchAdsOpenBox()) {
                    return this.checkWatchAdsFlipCard();
                }
            }
        }
        return true;
    },

    checkWatchAdsOpenBox: function () {
        if (this.watchAdsMap.box.count >= game.adsManager.boxMaxPopCount) {
            return false;
        }
        game.popupMan.popupWatchAdsGetItem(_("reward_video_open_box"), "icon_gift_box.png", "open_box", function (watched) {
            if (watched) {
                StoreHelper.getInstance().onOpenBox();
            }
        });
        this.watchAdsMap.box.count++;
        return true;
    },

    checkWatchAdsFlipCard: function () {
        if (this.watchAdsMap.card.count >= game.adsManager.cardMaxPopCount) {
            return false;
        }
        game.popupMan.popupWatchAdsGetItem(_("open_title"), "icon_card.png", "flip_card", function (watched) {
            if (watched) {
                game.popupMan.popupCard();
            }
        });
        this.watchAdsMap.card.count++;
        return true;
    },

    checkWatchAdsGetDiamonds: function () {
        var lastDailyDiamondTime = game.playerMan.player.lastDailyDiamondTime;
        var lastPopDay = game.utils.getDayByTs(lastDailyDiamondTime);
        var currentDay = game.utils.getDayByTs(Date.now());
        if (currentDay <= lastPopDay) {
            return false;
        }
        game.playerMan.setLastDailyDiamondsTime();
        game.popupMan.popupWatchAdsGetDiamonds("daily_diamonds", function (watched) {
            if (watched) {
                StoreHelper.getInstance().popupAddDiamondsDlg(game.config.dailyDiamonds, "daily_diamonds");
            }
        });
        return true;
    },

    getTotalStarCount: function () {
        var levelList = ConfigMan.getInstance().getLevelList();
        var starCount = 0;
        for (var i = 0; i < levelList.length; ++i) {
            var levelStarCount = game.playerMan.getLevelStar(i + 1);
            var hardLevelStarCount = game.playerMan.getHardLevelStar(i + 1);
            starCount += levelStarCount;
            starCount += hardLevelStarCount;
        }
        return starCount;
    },

    getMaxLevel: function () {
        var normalLevel = game.playerMan.getLevel();
        var hardLevel = game.playerMan.getHardLevel();
        return Math.max(normalLevel, hardLevel);
    },

    canShowGiftBox: function () {
        var adsReady = game.adsManager.isRewardVideoReady();
        var isLevelOk = this.levelId >= 3 && this.levelId % 3 === 0;
        var giftCountOk = this.giftCount <= 3;
        return (adsReady && giftCountOk && isLevelOk);
    },

    addGiftCount: function () {
        this.giftCount++;
    },

    onGiftBoxOpened: function (callback) {
        var randomNum = game.utils.randomNextInt(100);
        if (randomNum < 50) {
            StoreHelper.getInstance().onOpenBox(callback);
        } else {
            game.popupMan.popupCard(callback);
        }
    }
});

GameMan._instance = null;
GameMan._firstUseInstance = true;

/**
 *
 * @returns {GameMan}
 */
GameMan.getInstance = function () {
    if (GameMan._firstUseInstance) {
        GameMan._firstUseInstance = false;
        GameMan._instance = new GameMan();
    }
    return GameMan._instance;
};

module.exports = GameMan;
},{"../../common/enum/AdsPlace":10,"../config/ConfigMan":41,"../enum/SkinRewardType":118,"../enum/SkinType":119,"../enum/WheelType":121,"../events/EventsName":122,"../model/StoreHelper":129}],125:[function(require,module,exports){
/**
 * Created by qinning on 15/5/12.
 */
var PlayerInfo = require("../entity/PlayerInfo");
var EventsName = require("../events/EventsName");
var BoostType = require("../enum/BoostType");

var PLAYER_KEY = "player_key";

var PlayerMan = cc.Class.extend({
    player: null,
    bestScoreKey: null,
    levelBoardKey: null,

    inited: false,
    ctor: function () {
    },

    initData: function () {
        if (this.inited) {
            return;
        }
        this.inited = false;
        var playerInfoStr = game.storageController.getItem(PLAYER_KEY, null);
        var player;
        if (playerInfoStr == null || playerInfoStr == "") {
            player = PlayerInfo.createDefault();
            game.storageController.setItem(PLAYER_KEY, JSON.stringify(player));
            game.analyseManager.addVirtualCurrency("init_player", player.diamonds);
        } else {
            player = new PlayerInfo();
            player.unmarshall(JSON.parse(playerInfoStr));
        }
        this.player = player;
    },

    removedAds: function () {
        this.player.removedAds = true;
        game.adsManager.removeBannerAds("top");
        game.adsManager.removeBannerAds("bottom");
        game.adsManager.removeNativeAd("pass");
        this._flushToStorage();
    },

    setRated: function () {
        this.player.rated = true;
        this._flushToStorage();
    },

    getLevel: function () {
        if (cc.isUndefined(this.player.level)) {
            return 1;
        } else {
            return this.player.level;
        }
    },

    setLevel: function (level) {
        if (this.player.level < level) {
            this.player.level = level;
            game.analyseManager.trackPlayerLevel(level);
            this._flushToStorage();
        }
    },

    updateLevelData: function (level, name, data) {
        if (cc.isUndefined(this.player.levelsMap[level])) {
            this.player.levelsMap[level] = {};
        }
        this.player.levelsMap[level][name] = data;
        this._flushToStorage();
    },

    getLevelData: function (level, name) {
        return (this.player.levelsMap[level] || {})[name];
    },

    getLevelStar: function (level) {
        return this.getLevelData(level, "star") || 0;
    },

    getHardLevelStar: function (level) {
        return this.getLevelData(level, "hardStar") || 0;
    },

    addInterstitialAdCount: function () {
        this.player.interstitialAdCount++;
        this._flushToStorage();
    },

    addRewardedAdCount: function () {
        this.player.rewardedAdCount++;
        this._flushToStorage();
    },

    setHardLevel: function (level) {
        if (this.player.hardLevel < level) {
            this.player.hardLevel = level;
            this._flushToStorage();
        }
    },

    getHardLevel: function () {
        if (cc.isUndefined(this.player.hardLevel)) {
            return 1;
        } else {
            return this.player.hardLevel;
        }
    },

    getBoostCount: function (boostType) {
        return this.player.boostMap[boostType] || 0;
    },

    useBoost: function (boostType) {
        if (this.getBoostCount(boostType) > 0) {
            this.player.boostMap[boostType]--;
            if (boostType === BoostType.SPLIT) {
                game.analyseManager.consumeItem("boost_split", 1);
            } else if (boostType === BoostType.THREE_BALL) {
                game.analyseManager.consumeItem("boost_new_3", 1);
            }
            this._flushToStorage();
            return true;
        }
        return false;
    },

    addBoost: function (boostType, count) {
        this.player.boostMap[boostType] += count;
        this._flushToStorage();
        game.eventDispatcher.dispatchEvent(EventsName.REFRESH_BOOST);
    },

    setBoost: function (boostType, count) {
        this.player.boostMap[boostType] = count;
        this._flushToStorage();
        game.eventDispatcher.dispatchEvent(EventsName.REFRESH_BOOST);
    },

    addDiamonds: function (diamonds, reason, buyItemName, buyItemCount, isUSDPurchased) {
        if (isNaN(diamonds)) {
            cc.error("diamonds is NAN");
            return;
        }
        if (diamonds > 0) {
            game.audioPlayer.playEffectByKey("diamond_add");
            if (!isUSDPurchased) {
                if (reason) {
                    game.analyseManager.addVirtualCurrency(reason, diamonds);
                } else {
                    game.analyseManager.addVirtualCurrency("unkonw_reason", diamonds);
                    cc.error("error addDiamonds unknown reason:" + reason);
                }
            }
        } else if (diamonds < 0) {
            if (buyItemName && buyItemCount) {
                game.analyseManager.consumeVirtualCurrency(buyItemName, buyItemCount, -diamonds);
            } else {
                cc.error("error addDiamonds unknown buyItemName:" + buyItemName + ",buyItemCount:" + buyItemCount);
                game.analyseManager.consumeVirtualCurrency("unknown_reason", 0, -diamonds);
            }
        }
        this.player.diamonds += diamonds;
        this._flushToStorage();
        game.eventDispatcher.dispatchEvent(EventsName.DIAMONDS_UPDATE, {
            "diamonds": this.player.diamonds,
            "delta": diamonds
        });
    },

    getDiamonds: function () {
        return this.player.diamonds;
    },

    setTaskClaimed: function (taskId) {
        cc.log("PlayerMan setTaskClaimed:" + taskId);
        this.player.taskMap[taskId] = true;
        this._flushToStorage();
    },

    isTaskClaimed: function (taskId) {
        cc.log("PlayerMan isTaskClaimed:" + taskId);
        return !!this.player.taskMap[taskId];
    },

    setGuided: function (guided) {
        this.player.guided = guided;
        this._flushToStorage();
    },

    setLastWheelTime: function (wheelTime) {
        this.player.lastWheelTime = wheelTime;
        this._flushToStorage();
    },

    getLastWheelTime: function () {
        return this.player.lastWheelTime;
    },

    setCurrentSkinId: function (skinId) {
        if (skinId === this.player.currentSkinId) {
            return;
        }
        var BallPool = require("../entity/BallPool");
        BallPool.drainAllPools();
        this.player.currentSkinId = skinId;
        this._flushToStorage();
    },

    getCurrentSkinId: function () {
        return this.player.currentSkinId;
    },

    setClaimedSkin: function (skinId) {
        this.player.skinMap[skinId] = true;
        this._flushToStorage();
    },

    hasSkin: function (skinId) {
        return !!this.player.skinMap[skinId];
    },

    isNewPlayer: function () {
        return (Date.now() - this.player.createDt < 24 * 3600 * 1000);
    },

    getRegisterDay: function () {
        return Math.floor((Date.now() - this.player.createDt) / (24 * 3600 * 1000)) + 1;
    },

    currentDay: function(){
        return game.utils.getDayByTs(Date.now());
    },

    checkConsecutiveLoginDay: function() {
        var today = this.currentDay();
        var days = today - this.player.lastLoginDay;
        if (days < 0) {
            cc.error("consecutive login day error, today is smaller than lastLoginDay, maybe you have adjust the time.");
            days = 0;
        }
        if (days <= 1){
            this.player.consecutiveLoginDays += days;
        }
        else{
            this.player.consecutiveLoginDays = 1;
        }

        this.player.lastLoginDay = today;
        if (this.player.consecutiveLoginDays < 1) {
            this.player.consecutiveLoginDays = 1;
        }
        return this.player.consecutiveLoginDays;
    },

    setLastClaimDailyBonusDay: function (day) {
        this.player.lastClaimDailyBonusDay = day;
        this._flushToStorage();
    },

    setNextDayTips: function () {
        this.player.nextDayTips = true;
        this._flushToStorage();
    },

    isSpecialOfferPurchased: function (pid) {
        return this.player.specialOfferMap[pid] || false;
    },

    setSpecialOfferPurchased: function (pid) {
        this.player.specialOfferMap[pid] = true;
        this._flushToStorage();
        game.eventDispatcher.dispatchEvent(EventsName.UPDATE_SPECIAL_OFFER);
    },

    setSkinAdjusted: function () {
        this.player.skinAdjusted = true;
        this._flushToStorage();
    },

    setLastShowRateTime: function () {
        this.player.lastShowRateTime = Date.now();
        this._flushToStorage();
    },

    addRewardAdCountPerDay: function () {
        this.tryClearPreviousAdCountPerDay();
        if (cc.isUndefined(this.player.rewardAdCountPerDay)) {
            this.player.rewardAdCountPerDay = 0;
        }
        this.player.rewardAdCountPerDay++;
        this._flushToStorage();
        game.eventDispatcher.dispatchEvent(EventsName.REWARDED_VIDEO_COUNT);
    },

    getRewardAdPlaceCountPerDay: function () {
        this.tryClearPreviousAdCountPerDay();
        return this.player.rewardAdCountPerDay || 0;
    },

    tryClearPreviousAdCountPerDay: function () {
        if (this.player.rewardAdRecordDay !== this.getRegisterDay()) {
            this.player.rewardAdCountPerDay = 0;
            this.player.rewardAdRecordDay = this.getRegisterDay();
        }
    },

    addIapCount: function () {
        this.player.iapCount++;
        this._flushToStorage();
    },

    addFailCount: function (levelId) {
        this.player.failCountMap[levelId] = this.getFailCount(levelId) + 1;
        this._flushToStorage();
    },

    getFailCount: function (levelId) {
        cc.log("skip fail count map:" + JSON.stringify(this.player.failCountMap));
        return this.player.failCountMap[levelId] || 0;
    },

    addSkinAdsCount: function (skinId) {
        this.player.skinAdsCountMap[skinId] = this.getSkinAdsCount(skinId) + 1;
        this._flushToStorage();
    },

    getSkinAdsCount: function (skinId) {
        return this.player.skinAdsCountMap[skinId] || 0;
    },

    setLastLoginTime: function () {
        this.player.lastLoginTime = Date.now();
        this._flushToStorage();
    },

    setLastDailyDiamondsTime: function () {
        this.player.lastDailyDiamondTime = Date.now();
        this._flushToStorage();
    },

    purchasedAimItem: function () {
        this.player.hasAimItem = true;
        this._flushToStorage();
    },

    _flushToStorage: function () {
        game.storageController.setItem(PLAYER_KEY, JSON.stringify(this.player));
    }
});

PlayerMan._instance = null;
PlayerMan._firstUseInstance = true;

/**
 *
 * @returns {PlayerMan}
 */
PlayerMan.getInstance = function () {
    if (PlayerMan._firstUseInstance) {
        PlayerMan._firstUseInstance = false;
        PlayerMan._instance = new PlayerMan();
    }
    return PlayerMan._instance;
};

module.exports = PlayerMan;
},{"../entity/BallPool":103,"../entity/PlayerInfo":108,"../enum/BoostType":110,"../events/EventsName":122}],126:[function(require,module,exports){
/**
 * Created by oye on 15/11/21.
 */

var NoticeController = require("../controller/NoticeController");
var GameOverController = require("../controller/GameOverController");
var HelpController = require("../controller/HelpController");
var GameWinController = require("../controller/GameWinController");
var PassController = require("../controller/PassController");
var StoreController = require("../controller/StoreController");
var PauseController = require("../controller/PauseController");
var FailController = require("../controller/FailController");
var RankController = require("../controller/RankController");
var RewardVideoController = require("../controller/RewardVideoController");
var WheelController = require("../controller/WheelController");
var RewardDoubleController = require("../controller/RewardDoubleController");
var BagController = require("../controller/BagController");
var RewardGiftController = require("../controller/RewardGiftController");
var SkinController = require("../controller/SkinController");
var DailyBonusController = require("../controller/DailyBonusController");
var SpecialOfferController = require("../controller/SpecialOfferController");
var RewardNoticeController = require("../controller/RewardNoticeController");
var TaskController = require("../controller/TaskController");
var SettingController = require("../controller/SettingController");
var ReliveController = require("../controller/ReliveController");
var WatchAdsGetSkinController = require("../controller/WatchAdsGetSkinController");
var WatchAdsGetItemController = require("../controller/WatchAdsGetItemController");
var WatchAdsGetDiamondsController = require("../controller/WatchAdsGetDiamondsController");
var WatchAdsGet3StarController = require("../controller/WatchAdsGet3StarController");
var WatchAdsRelifeController = require("../controller/WatchAdsRelifeController");
var CardController = require("../controller/CardController");

var PopupMan = {

    popupCommonDlg: function (info, yesCallback) {
        var noticeNode = NoticeController.createFromCCB();
        noticeNode.controller.initWithYes(info, yesCallback, null);
        noticeNode.controller.popup();
    },

    popupYesNoCommonDlg: function (info, yesInfo, cancelInfo, yesCallback, noCallback, isShowClose, isShowAds) {
        var noticeNode = NoticeController.createFromCCB();
        noticeNode.controller.initWithYesNo(info, yesInfo, cancelInfo, yesCallback, noCallback, isShowClose, isShowAds);
        noticeNode.controller.popup();
    },

    popupRewardDlg: function (info, yesCallback, reward1Sprite, reward1Count, reward2Sprite, reward2Count) {
        var noticeNode = NoticeController.createFromCCB();
        noticeNode.controller.initWithRewardYes(info, yesCallback, reward1Sprite, reward1Count, reward2Sprite, reward2Count);
        noticeNode.controller.popup();
    },

    popupNewTipCommonDlg: function (info, yesInfo, cancelInfo, yesCallback, noCallback, isShowClose) {
        var noticeNode = NoticeController.createGuideFromCCB();
        noticeNode.controller.initWithYesNo(info, yesInfo, cancelInfo, yesCallback, noCallback, isShowClose);
        noticeNode.controller.popup();
    },

    popupGameOverDlg: function (percent, replayCallback) {
        var gameOverNode = GameOverController.createFromCCB();
        gameOverNode.controller.initWith(percent, replayCallback);
        gameOverNode.controller.popup();
    },

    popupRateDlg: function (ratedCallback, closeCallback) {
        var rateInfo = game.local.getValue("rate_info");
        this.popupYesNoCommonDlg(rateInfo,
            game.local.getValue("rate_confirm"), game.local.getValue("rate_cancel"), function () {
                //cc.sys.openURL(game.config.getPlatformDownloadUrl());
                if (game.utils.isIOS()) {
                    cc.sys.openURL(game.config.getPlatformDownloadUrl());
                } else {
                    jsb_dp.oneSdkBridge.openApplicationMarket(game.config.getPackageName());
                }
                game.adsManager.rateTime = Date.now();
                if (ratedCallback) {
                    ratedCallback();
                }
            },
            function () {
                if (closeCallback) {
                    closeCallback();
                }
            }, false);
    },

    popupHelpDlg: function () {
        var helpNode = HelpController.createFromCCB();
        helpNode.controller.popup();
    },

    popupGameWinDlg: function (replayCallback, nextCallback) {
        var gameOverNode = GameWinController.createFromCCB();
        gameOverNode.controller.initWith(replayCallback, nextCallback);
        gameOverNode.controller.popup();
    },

    popupPassDlg: function (replayCallback, nextCallback) {
        var node = PassController.createFromCCB();
        node.controller.initWith(replayCallback, nextCallback);
        node.controller.popup();
    },

    popupFailDlg: function (replayCallback, skipCallback) {
        var node = FailController.createFromCCB();
        node.controller.initWith(replayCallback, skipCallback);
        node.controller.popup();
    },

    popupStoreDlg: function (type, callback) {
        var node = StoreController.createFromCCB();
        node.controller.initWith(type, callback);
        node.controller.popup();
    },

    popupPauseDlg: function (resuemCallback) {
        var node = PauseController.createFromCCB();
        node.controller.initWith(resuemCallback);
        node.controller.popup();
    },
    popupRankDlg: function (rankType, closeCallback) {
        var node = RankController.createFromCCB();
        node.controller.init(rankType, closeCallback);
        node.controller.popup();
        return node;
    },
    popupGroupRankDlg: function () {
        if (this.lastGroupRankNode) {
            this.lastGroupRankNode.controller.closeCallback = null;
            this.lastGroupRankNode.controller.close();
        }
        var RankType = require("../enum/RankType");
        var self = this;
        this.lastGroupRankNode = this.popupRankDlg(RankType.Group, function () {
            self.lastGroupRankNode = null;
        });

    },
    popupRewardVideo: function (closeCallback) {
        var node = RewardVideoController.createFromCCB();
        node.controller.init(closeCallback);
        node.controller.popup();
    },

    popupWheelDlg: function (wheelType, callback) {
        var node = WheelController.createFromCCB();
        node.controller.initWith(wheelType, callback);
        node.controller.popup();
    },

    popupRewardDoubleTipDlg: function (image, count, rewardName, callback) {
        var node = RewardDoubleController.createFromCCB();
        node.controller.init(image, count, rewardName, callback);
        node.controller.popup();
    },

    popupBagDlg: function () {
        var node = BagController.createFromCCB();
        node.controller.popup();
    },

    popupRewardGift: function (closeCallback) {
        var node = RewardGiftController.createFromCCB();
        node.controller.init(closeCallback);
        node.controller.popup();
    },

    popupSkinDlg: function () {
        var node = SkinController.createFromCCB();
        node.controller.popup();
    },

    popupDailyBonus: function () {
        var node = DailyBonusController.createFromCCB();
        node.controller.popup();
    },

    popupSpeicialOffer: function () {
        var node = SpecialOfferController.createFromCCB();
        node.controller.popup();
    },

    popupRewardNoticeDlg: function (info, yesCallback, reward1Sprite, reward1Count, reward2Sprite, reward2Count) {
        var noticeNode = RewardNoticeController.createFromCCB();
        noticeNode.controller.initWithRewardYes(info, yesCallback, reward1Sprite, reward1Count, reward2Sprite, reward2Count);
        noticeNode.controller.popup();
    },

    popupTaskDlg: function () {
        var node = TaskController.createFromCCB();
        node.controller.popup();
    },

    popupSettingDlg: function () {
        var node = SettingController.createFromCCB();
        node.controller.popup();
    },

    popupReliveDlg: function (reliveCallback, cancelCallback) {
        var node = ReliveController.createFromCCB();
        node.controller.initWith(reliveCallback, cancelCallback);
        node.controller.popup();
    },

    popupWatchAdsGetSkin: function (skinCfg) {
        var node = WatchAdsGetSkinController.createFromCCB();
        node.controller.initWith(skinCfg);
        node.controller.popup();
    },

    popupWatchAdsGetItem: function (title, spriteName, rewardName, closeCallback) {
        var node = WatchAdsGetItemController.createFromCCB();
        node.controller.initWith(title, spriteName, rewardName, closeCallback);
        node.controller.popup();
    },

    popupWatchAdsGetDiamonds: function (rewardName, closeCallback) {
        var node = WatchAdsGetDiamondsController.createFromCCB();
        node.controller.initWith(rewardName, closeCallback);
        node.controller.popup();
    },

    popupGet3Star: function (rewardName, closeCallback) {
        var node = WatchAdsGet3StarController.createFromCCB();
        node.controller.initWith(rewardName, closeCallback);
        node.controller.popup();
    },
    
    popupRelife: function (callback) {
        var node = WatchAdsRelifeController.createFromCCB();
        node.controller.initWith(callback);
        node.controller.popup();
    },

    popupCard: function (callback) {
        var node = CardController.createFromCCB();
        node.controller.initWith(callback);
        node.controller.popup();
    }
};

module.exports = PopupMan;
},{"../controller/BagController":53,"../controller/CardController":55,"../controller/DailyBonusController":57,"../controller/FailController":60,"../controller/GameOverController":62,"../controller/GameWinController":63,"../controller/HelpController":65,"../controller/NoticeController":70,"../controller/PassController":73,"../controller/PauseController":74,"../controller/RankController":75,"../controller/ReliveController":76,"../controller/RewardDoubleController":78,"../controller/RewardGiftController":79,"../controller/RewardNoticeController":80,"../controller/RewardVideoController":81,"../controller/SettingController":82,"../controller/SkinController":83,"../controller/SpecialOfferController":86,"../controller/StoreController":87,"../controller/TaskController":89,"../controller/WatchAdsGet3StarController":92,"../controller/WatchAdsGetDiamondsController":93,"../controller/WatchAdsGetItemController":94,"../controller/WatchAdsGetSkinController":95,"../controller/WatchAdsRelifeController":96,"../controller/WheelController":97,"../enum/RankType":115}],127:[function(require,module,exports){
var FileCacheStub = require("../../common/util/FileCacheStub");

var ResourcesMan = cc.Class.extend({

    fileCacheStub: null,

    ctor: function () {
        this.fileCacheStub = new FileCacheStub();
    },

    preload: function (callback) {
        //cc.log("preload 111");
        var results = game.utils.loadJson("res/resource_list/resource_list.json");
        var audios = game.utils.loadJson("res/resource_list/audio_list.json");
        var fileCacheStub = this.fileCacheStub;

        var picList = [];
        var plistList = [];
        var cacheList = [];
        results.forEach(function (fileName) {
            var extName = cc.path.extname(fileName);
            if (extName === ".png" || extName === ".jpg") {
                picList.push(fileName);
            } else if (extName === ".plist") {
                plistList.push(fileName);
            } else if (extName === ".ccbi" || extName === ".json" || extName === ".atlas" || extName === ".ogg") {
                cacheList.push(fileName);
            }
        });

        var loadPicFuncs = [];
        for (var i = 0; i < picList.length; ++i) {
            //cc.log("preload 222");
            var loadPicFunc = function (fileName) {
                return function () {
                    cc.textureCache.addImage(fileName);
                };
            }
            loadPicFuncs.push(loadPicFunc(picList[i]));
        }

        var loadListFuc = function () {
            //cc.log("preload 333");
            plistList.forEach(function (fileName) {
                var index = fileName.indexOf(".");
                if (index >= 0) {
                    var plistName = fileName.substr(0, index);
                    cc.spriteFrameCache.addSpriteFrames(game.utils.sprintf("%s.plist", plistName),
                        game.utils.sprintf("%s.png", plistName));
                }
            });
        };

        var cacheFunc = function () {
            //cc.log("preload 444");
            cacheList.forEach(function (fileName) {
                fileCacheStub.cacheFile(fileName);
            });
        };

        var preloadAudio = function () {
            //cc.log("preload 555");
            audios.forEach(function (fileName) {
                game.audioPlayer.preloadEffect(fileName);
            });
        };

        var funcList = loadPicFuncs.concat([loadListFuc, cacheFunc, preloadAudio]);

        game.utils.loadIterator(funcList, function () {
            if (callback) {
                callback();
            }
        });
    }
});

ResourcesMan._instance = null;
ResourcesMan._firstUseInstance = true;

/**
 *
 * @returns {ResourcesMan}
 */
ResourcesMan.getInstance = function () {
    if (ResourcesMan._firstUseInstance) {
        ResourcesMan._firstUseInstance = false;
        ResourcesMan._instance = new ResourcesMan();
    }
    return ResourcesMan._instance;
};

module.exports = ResourcesMan;
},{"../../common/util/FileCacheStub":34}],128:[function(require,module,exports){
/**
 * Created by qinning on 2018/1/1.
 */

var SceneType = require("../enum/SceneType");
var MenuScene = require("../scene/MenuScene");
var LevelScene = require("../scene/LevelScene");
var PackageScene = require("../scene/PackageScene");
var GameScene = require("../scene/GameScene");
var GameBridge = require("../../common/bridge/GameBridge");

var SceneMan = cc.Class.extend({

    sceneMap: null,

    lastScene: null,
    curScene: null,

    ctor: function () {
        this.sceneMap = {};
        this.register();
        this.lastScene = SceneType.NONE;
        this.curScene = SceneType.MENU;
    },

    setCurScene: function (scene) {
        this.curScene = scene;
    },

    register: function () {
        this.sceneMap[SceneType.MENU] = GameBridge.getMenuScene;
        this.sceneMap[SceneType.PACKAGE] = function () {
            return new PackageScene();
        };
        this.sceneMap[SceneType.LEVEL] = function () {
            return new LevelScene();
        };
        this.sceneMap[SceneType.GAME] = function () {
            return new GameScene();
        };
    },

    switchScene: function (sceneType) {
        this.lastScene = this.curScene;
        this.curScene = sceneType;
        var scene = this.sceneMap[this.curScene];
        if (scene) {
            cc.director.runScene(scene());
        }
    },

    switchLastScene: function () {
        this.switchScene(this.lastScene);
    }
});

SceneMan._instance = null;
SceneMan._firstUseInstance = true;

/**
 *
 * @returns {SceneMan}
 */
SceneMan.getInstance = function () {
    if (SceneMan._firstUseInstance) {
        SceneMan._firstUseInstance = false;
        SceneMan._instance = new SceneMan();
    }
    return SceneMan._instance;
};

module.exports = SceneMan;
},{"../../common/bridge/GameBridge":3,"../enum/SceneType":116,"../scene/GameScene":130,"../scene/LevelScene":131,"../scene/MenuScene":133,"../scene/PackageScene":134}],129:[function(require,module,exports){
/**
 * Created by qinning on 2017/1/23.
 */

var PaymentInfo = require("../../common/entity/PaymentInfo");
var PaymentCode = require("../../common/enum/PaymentCode");
var ProductInfo = require("../../common/entity/ProductInfo");
var StoreType = require("../enum/StoreType");
var ConfigMan = require("../config/ConfigMan");
var BoostType = require("../enum/BoostType");
var EventsName = require("../events/EventsName");
var SkinType = require("../enum/SkinType");

var StoreHelper = cc.Class.extend({

    /**
     * @type {Array.<ProductInfo>}
     */
    productList: null,
    /**
     * @type {Array.<StoreConfig>}
     */
    storeList: null,

    inited: false,

    _rewardCB: null,

    ctor: function () {
        game.storeManager.setPaymentDelegate(this);
        this.storeList = ConfigMan.getInstance().getStoreList();

        game.adsManager.setAdListener(this);
    },

    init: function () {
        if (this.inited) {
            return;
        }
        this.inited = true;
        this.requestProducts();
        this.getUnverifiedReceiptList();
    },

    clear: function () {
        game.adsManager.setAdListener(null);
    },

    onRewardedVideoFinished: function (isRewarded) {
        cc.log("onRewardedVideoFinished:" + isRewarded);
        if (isRewarded) {
            var time = 400;
            setTimeout(this.onRewardedVideoReward.bind(this), time);
        } else {
            if (this._rewardCB) {
                this._rewardCB(false);
                this._rewardCB = null;
            }
        }
    },

    onShowVideoAdBegin: function () {
        cc.log("GameNode onShowVideoAdBegin");
    },

    onShowVideoAdEnd: function () {
        cc.log("GameNode onShowVideoAdEnd");
    },

    onRewardedVideoReward: function () {
        game.analyseManager.trackEvent("WatchRVSource", {name: this._adName});
        if (this._rewardCB) {
            this._rewardCB(true);
            this._rewardCB = null;
            return;
        }
        if (game.playerMan.getRewardAdPlaceCountPerDay() >= game.config.rewardAdMaxCountPerDay) {
            cc.log("StoreHelper onRewardedVideoReward has reached max count:" + game.playerMan.getRewardAdPlaceCountPerDay());
            return;
        }
        var name = "";
        if (this._adParam1) {
            game.analyseManager.trackEvent(this._adParam1);
            name = this._adParam1;
        } else {
            name = "unknown";
            cc.error("StoreHelper adParam is null:" + this._adParam1);
        }
        this._adParam1 = null;
        game.playerMan.addRewardAdCountPerDay();
        var freeEntity = this.getStoreEntityByType(StoreType.FREE);
        game.popupMan.popupRewardNoticeDlg(game.local.getValue("reward_video_diamonds"),
            function () {
                game.playerMan.addDiamonds(freeEntity.count, "reward_video_" + name);
            }, this.getBoostImage(BoostType.DIAMOND), freeEntity.count);
    },

    /**
     * @param pid
     * @returns {StoreConfig | null}
     */
    getStoreEntity: function (pid) {
        for (var i = 0; i < this.storeList.length; ++i) {
            if (this.storeList[i].pid === pid) {
                return this.storeList[i];
            }
        }
        return null;
    },

    getStoreEntityByType: function (type) {
        for (var i = 0; i < this.storeList.length; ++i) {
            if (this.storeList[i].type === type) {
                return this.storeList[i];
            }
        }
        return null;
    },

    getBoostImage: function (boostType) {
        switch (boostType) {
            case BoostType.SPLIT:
                return "store_3_multiple.png";
            case BoostType.THREE_BALL:
                return "store_3_new.png";
            case BoostType.DIAMOND:
                return "icon_diamond_1.png";
            case BoostType.AIM_ITEM:
                return "store_aim.png";
        }
    },

    _getNumFromString: function (text) {
        return text.replace(/[^0-9.]/ig, "");
    },

    updatePrice: function (product) {
        var storeProduct = this.getStoreEntity(product.productId);
        if (storeProduct) {
            storeProduct.price = product.price;
            try {
                if (storeProduct.original_price) {
                    var priceStr = this._getNumFromString(product.price);
                    var priceNum = Number(priceStr);
                    storeProduct.original_price = product.price.replace(priceStr,
                        (priceNum * (storeProduct.discount_multi + 1)).toFixed(2));
                }
            } catch (ex) {
                cc.error("update price:" + ex);
            }
        }
    },

    checkAndShowRewardVideo: function (name, cb, param1) {
        this._adParam1 = param1;
        this._adName = name;
        if (game.adsManager.isRewardVideoReady()) {
            this._rewardCB = cb;
            game.adsManager.showRewardVideoAd(name);
        } else {
            game.analyseManager.trackEvent("WatchRVNotReady", {name: name});
            cc.log("reward video not ready");
        }
    },

    /**
     * @param {StoreConfig} storeEntity
     */
    buyProduct: function (storeEntity) {
        switch (storeEntity.type) {
            case StoreType.NEW_3:
            case StoreType.SPLIT:
            case StoreType.FIRST_PURCHASE:
                game.storeManager.payForProduct(storeEntity.pid);
                break;
            case StoreType.DIAMOND:
                //game.analyseManager.trackEvent("PurchaseDiamonds", {"pid": storeEntity.pid});
                game.storeManager.payForProduct(storeEntity.pid);
                break;
            case StoreType.FREE:
                this.checkAndShowRewardVideo(game.utils.isIOS() ? "daoju01" : "jili03");
                break;
            case StoreType.REMOVE_ADS:
                this.buyRemoveAds(storeEntity.pid);
                break;
            case StoreType.RESTORE:
                game.storeManager.restoreCompletedTransactions();
                break;
            case StoreType.NEW_AND_SPLIT:
                this.buyBoosts(storeEntity);
                break;
            case StoreType.AIM_ITEM:
                game.storeManager.payForProduct(storeEntity.pid);
                break;
        }
    },

    buyRemoveAds: function (pid) {
        if (game.playerMan.player.removedAds) {
            game.popupMan.popupCommonDlg(game.local.getValue("removed_all_ads_tips"));
        } else {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                game.popupMan.popupYesNoCommonDlg(game.local.getValue("purchase_no_ad_tips"),
                    game.local.getValue("buy_title"), game.local.getValue("cancel_title"), function () {
                        game.storeManager.payForProduct(pid);
                    }, null, false);
            } else {
                game.popupMan.popupYesNoCommonDlg(game.local.getValue("purchase_no_ad_tips"),
                    game.local.getValue("buy_title"), game.local.getValue("restore_title"), function () {
                    game.storeManager.payForProduct(pid);
                }, function () {
                    game.storeManager.restoreCompletedTransactions();
                }, true);
            }
        }
    },

    buySkin: function (skinCfg, rewardName, cb) {
        if (!game.playerMan.hasSkin(skinCfg.id)) {
            switch (skinCfg.type) {
                case SkinType.Diamonds:
                    if (game.playerMan.getDiamonds() >= skinCfg.count) {
                        game.playerMan.setClaimedSkin(skinCfg.id);
                        game.playerMan.setCurrentSkinId(skinCfg.id);
                        game.playerMan.addDiamonds(-skinCfg.count, "purchase_skin", "skin", 1);
                        game.eventDispatcher.dispatchEvent(EventsName.UPDATE_SKIN);
                        game.analyseManager.trackEvent("DiamondPurchaseSkin", {"skinId": skinCfg.id});
                        cb && cb(true);
                    } else {
                        this.popupLackDiamonds();
                    }
                    break;
                case SkinType.WatchAds:
                    this.checkAndShowRewardVideo(rewardName, function (rewarded) {
                        if (rewarded) {
                            game.playerMan.addSkinAdsCount(skinCfg.id);
                            if (game.playerMan.getSkinAdsCount(skinCfg.id) >= skinCfg.count) {
                                game.playerMan.setClaimedSkin(skinCfg.id);
                                game.playerMan.setCurrentSkinId(skinCfg.id);

                                game.popupMan.popupRewardNoticeDlg(game.local.getValue("skin_claimed"),
                                    function () {
                                    }, skinCfg.image + "_l.png", 1);
                                cb && cb(true);
                            }
                            game.analyseManager.trackEvent("RewardVideoPurchaseSkin", {"skinId": skinCfg.id});
                            game.eventDispatcher.dispatchEvent(EventsName.UPDATE_SKIN);
                        }
                    });
                    break;
                default:
                    cc.error("undefined skin type:" + skinCfg.type);
                    break;
            }
        }
    },

    useSkin: function (skinCfg) {
        game.playerMan.setCurrentSkinId(skinCfg.id);
        game.eventDispatcher.dispatchEvent(EventsName.UPDATE_SKIN);
    },

    buyBoosts: function (storeEntity) {
        if (game.playerMan.getDiamonds() >= storeEntity.count) {
            var splitCount = storeEntity.data.multiple_3;
            var threeBallCount = storeEntity.data.new_3;
            var splitImage = this.getBoostImage(BoostType.SPLIT);
            var new3Image = this.getBoostImage(BoostType.THREE_BALL);
            game.playerMan.addDiamonds(-storeEntity.count / 2, "buy_boosts", "boost_split", splitCount);
            game.playerMan.addDiamonds(-storeEntity.count / 2, "buy_boosts", "boost_new_3", threeBallCount);
            game.analyseManager.trackEvent("DiamondPurchaseBoosts", {"diamonds": storeEntity.count});
            game.popupMan.popupRewardDlg(game.local.getValue("purchase_boost_success"),
                function () {
                    game.playerMan.addBoost(BoostType.SPLIT, splitCount);
                    game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
                }, splitImage, splitCount, new3Image, threeBallCount);
        } else {
            this.popupLackDiamonds();
        }
    },

    buyOneBoost: function () {
        var storeEntity = {
            "count": 20,
            "data": {
                "new_3": 1,
                "multiple_3": 1
            }
        };
        if (game.playerMan.getDiamonds() >= storeEntity.count) {
            var splitCount = storeEntity.data.multiple_3;
            var threeBallCount = storeEntity.data.new_3;
            game.playerMan.addDiamonds(-storeEntity.count / 2, "buy_boosts", "boost_split", splitCount);
            game.playerMan.addDiamonds(-storeEntity.count / 2, "buy_boosts", "boost_new_3", threeBallCount);
            game.analyseManager.trackEvent("DiamondPurchaseBoostsInGame", {"diamonds": storeEntity.count});
            game.playerMan.addBoost(BoostType.SPLIT, splitCount);
            game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
            return true;
        } else {
            //this.popupLackDiamonds();
            return false;
        }
    },

    skipLevel: function (levelId) {
        if (game.playerMan.getDiamonds() >= game.config.skipDiamonds) {
            game.playerMan.addDiamonds(-game.config.skipDiamonds, "skip_level", "skip_level", 1);
            game.analyseManager.consumeItem("skip_level", 1);
            game.analyseManager.trackEvent("DiamondPurchaseSkipLevel", {"level": levelId});
            return true;
        } else {
            this.popupLackDiamonds();
            return false;
        }
    },

    reliveLevel: function (levelId) {
        if (game.playerMan.getDiamonds() >= game.config.relifeDiamonds) {
            game.playerMan.addDiamonds(-game.config.relifeDiamonds, "revive", "revive", 1);
            game.analyseManager.consumeItem("revive", 1);
            game.analyseManager.trackEvent("DiamondPurchaseReliveLevel", {"level": levelId});
            return true;
        } else {
            this.popupLackDiamonds();
            return false;
        }
    },

    tryAimItem: function (levelId, callback) {
        this.checkAndShowRewardVideo("try_aim_item", function (rewarded) {
            if (rewarded) {
                game.analyseManager.trackEvent("RewardedVideoTryAimItem", {"level": levelId});
                callback && callback();
            }
        }.bind(this));
    },

    onOpenBox: function (callback) {
        //open the wheel.
        var WheelType = require("../enum/WheelType");
        game.popupMan.popupWheelDlg(WheelType.Box, callback);
    },

    popupLackDiamonds: function () {
        //game.popupMan.popupCommonDlg(_("diamond_not_enough"));
        if (!game.gameMan.isSpecialOfferPurchased()) {
            game.popupMan.popupSpeicialOffer();
        } else {
            var StoreType = require("../enum/StoreType");
            game.popupMan.popupStoreDlg(StoreType.DIAMOND);
        }
    },

    requestProducts: function () {
        var productIds = [];
        for (var i = 0; i < this.storeList.length; ++i) {
            var entity = this.storeList[i];
            if (entity && entity.pid) {
                productIds.push(entity.pid);
            }
        }
        cc.log("requestproducts:" + JSON.stringify(productIds));
        game.storeManager.requestProduct(productIds);
    },

    getUnverifiedReceiptList: function () {
        game.storeManager.getUnverifiedReceiptList();
    },

    /**
     * @param {PaymentCode} error
     * @param {PaymentInfo} paymentInfo
     */
    onPaymentCompleted: function (error, paymentInfo) {
        var paymentSuccess = false;
        if (error === PaymentCode.PAYMENT_CODE_SUCCESS) {
            this._onPaymentSuccess(paymentInfo, true);
            paymentSuccess = true;
        } else {
            game.popupMan.popupCommonDlg(game.local.getValue("purchase_fail"));
        }
        game.eventDispatcher.dispatchEvent(EventsName.PURCHASE_END, paymentSuccess);
    },

    /**
     * @param {Array.<PaymentInfo>} paymentInfoList
     */
    onGetUnverifiedReceiptList: function (paymentInfoList) {
        for (var i = 0; i < paymentInfoList.length; ++i) {
            this._onPaymentSuccess(paymentInfoList[i], false);
        }
    },

    /**
     * on get product list.
     * @param {Array.<ProductInfo>} productList
     */
    onGetProductList: function (productList) {
        this.productList = productList;
        for (var i = 0; i < productList.length; ++i) {
            var product = productList[i];
            this.updatePrice(product);
        }
    },

    /**
     * @param {PaymentInfo} paymentInfo
     * @param hasNotice
     * @private
     */
    _onPaymentSuccess: function (paymentInfo, hasNotice) {
        // var storeEntity = this.getStoreEntity()
        // var product = this._getProductById(paymentInfo.productId);
        // if (product) {
        //     // var price = this._getNumFromString(product.price) * 100;
        //     game.analyseManager.trackPurchaseEvent(price, product.title, paymentInfo.productId,
        //         paymentInfo.receipt);
        // }
        var storeEntity = this.getStoreEntity(paymentInfo.productId);
        var splitImage = this.getBoostImage(BoostType.SPLIT);
        var new3Image = this.getBoostImage(BoostType.THREE_BALL);
        var self = this;
        switch (storeEntity.type) {
            case StoreType.REMOVE_ADS:
                game.playerMan.removedAds();
                if (hasNotice) {
                    game.popupMan.popupCommonDlg(game.local.getValue("purchase_no_ad_success"));
                }
                if (cc.sys.os === cc.sys.OS_IOS) {
                    game.storeManager.consume(paymentInfo.purchaseId);
                }
                self.addIapCount(storeEntity);
                game.analyseManager.trackChargeRequest(paymentInfo.purchaseId, paymentInfo.productId, storeEntity.priceUS, "USD", 0, "IAP");
                game.analyseManager.trackChargeSuccess(paymentInfo.purchaseId);
                break;
            case StoreType.NEW_3:
            case StoreType.SPLIT:
                game.popupMan.popupRewardDlg(game.local.getValue("purchase_boost_success"), function () {
                    game.playerMan.addBoost(storeEntity.type, storeEntity.count);
                    game.storeManager.consume(paymentInfo.purchaseId);
                    self.addIapCount(storeEntity);
                }, storeEntity.image, storeEntity.count);
                break;
            case StoreType.FIRST_PURCHASE:
                var diamondCount = storeEntity.data.diamonds;
                game.popupMan.popupRewardDlg(game.local.getValue("purchase_success"),
                    function () {
                        game.playerMan.addDiamonds(diamondCount, "first_purchase", undefined, undefined, true);
                        game.storeManager.consume(paymentInfo.purchaseId);
                        game.playerMan.setSpecialOfferPurchased(paymentInfo.productId);
                        game.analyseManager.trackEvent("PurchaseSpecialOffer");
                        self.addIapCount(storeEntity);
                        //var splitCount = storeEntity.data.multiple_3;
                        //var threeBallCount = storeEntity.data.new_3;
                        //game.popupMan.popupRewardDlg(game.local.getValue("purchase_boost_success"),
                        //    function () {
                        //        game.playerMan.addBoost(BoostType.SPLIT, splitCount);
                        //        game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
                        //    }, splitImage, splitCount, new3Image, threeBallCount);
                        game.analyseManager.trackChargeRequest(paymentInfo.purchaseId, paymentInfo.productId, storeEntity.priceUS, "USD", diamondCount, "IAP");
                        game.analyseManager.trackChargeSuccess(paymentInfo.purchaseId);
                    }, this.getBoostImage(BoostType.DIAMOND), diamondCount);
                break;
            case StoreType.NEW_AND_SPLIT:
                var splitCount = storeEntity.data.multiple_3;
                var threeBallCount = storeEntity.data.new_3;
                game.popupMan.popupRewardDlg(game.local.getValue("purchase_boost_success"),
                    function () {
                        game.playerMan.addBoost(BoostType.SPLIT, splitCount);
                        game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
                        game.storeManager.consume(paymentInfo.purchaseId);
                        self.addIapCount(storeEntity);
                    }, splitImage, splitCount, new3Image, threeBallCount);
                break;
            case StoreType.DIAMOND:
                var count = storeEntity.count;
                game.popupMan.popupRewardDlg(game.local.getValue("purchase_success"),
                    function () {
                        game.playerMan.addDiamonds(count, "purchase", undefined, undefined, true);
                        game.storeManager.consume(paymentInfo.purchaseId);
                        self.addIapCount(storeEntity);
                        game.analyseManager.trackChargeRequest(paymentInfo.purchaseId, paymentInfo.productId, storeEntity.priceUS, "USD", count, "IAP");
                        game.analyseManager.trackChargeSuccess(paymentInfo.purchaseId);
                    }, storeEntity.image, count);
                break;
            case StoreType.AIM_ITEM:
                game.popupMan.popupRewardDlg(game.local.getValue("purchase_success"),
                    function () {
                        game.playerMan.purchasedAimItem();
                        game.storeManager.consume(paymentInfo.purchaseId);
                        game.analyseManager.trackEvent("PurchaseAimItem");
                        self.addIapCount(storeEntity);
                        game.analyseManager.trackChargeRequest(paymentInfo.purchaseId, paymentInfo.productId, storeEntity.priceUS, "USD", 0, "IAP");
                        game.analyseManager.trackChargeSuccess(paymentInfo.purchaseId);
                        game.eventDispatcher.dispatchEvent(EventsName.UPDATE_AIM_ITEM);
                    }, this.getBoostImage(BoostType.AIM_ITEM), 1);
                break;
        }
    },

    addIapCount: function (storeEntity) {
        game.playerMan.addIapCount();
        var iapCount = game.playerMan.player.iapCount;
        if (iapCount === 1) {
            game.analyseManager.trackEvent("FirstPurchase", {"pid": storeEntity.pid});
        } else if (iapCount === 2) {
            game.analyseManager.trackEvent("SecondPurchase", {"pid": storeEntity.pid});
        }
        if (iapCount >= 2) {
            game.analyseManager.trackEvent("MultiPurchase", {"pid": storeEntity.pid});
        }
        game.analyseManager.trackEvent("PurchaseLevel", {"levelId": game.gameMan.levelId, "pid": storeEntity.pid});
    },

    popupBoostRewardDlg: function (splitCount, threeBallCount, callback) {
        var new3Image = this.getBoostImage(BoostType.THREE_BALL);
        var splitImage = this.getBoostImage(BoostType.SPLIT);

        var image1 = undefined;
        var count1 = 0;
        var image2 = undefined;
        var count2 = 0;
        if (threeBallCount > 0) {
            image1 = new3Image;
            count1 = threeBallCount;
            if (splitCount > 0) {
                image2 = splitImage;
                count2 = splitCount;
            }
        } else {
            image1 = splitImage;
            count1 = splitCount;
        }

        game.popupMan.popupRewardNoticeDlg(game.local.getValue("reward_video_boosts"),
            function () {
                game.playerMan.addBoost(BoostType.SPLIT, splitCount);
                game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
                if (callback) {
                    callback();
                }
            }, image1, count1, image2, count2);
    },

    popupAddDiamondsDlg: function (count, rewardName, cb) {
        game.popupMan.popupRewardNoticeDlg(game.local.getValue("reward_video_diamonds"),
            function () {
                game.playerMan.addDiamonds(count, rewardName);
                cb && cb();
            }, this.getBoostImage(BoostType.DIAMOND), count);
    },

    popupRewardDoubleDlg: function (itemCount, type, rewardName, cb) {
        game.popupMan.popupRewardDoubleTipDlg(this.getBoostImage(type), itemCount, rewardName, function (double) {
            var count = double ? itemCount * 2 : itemCount;
            var splitCount = 0;
            var threeBallCount = 0;
            var diamondCount = 0;
            if (type === BoostType.SPLIT) {
                splitCount = count;
            } else if (type === BoostType.THREE_BALL) {
                threeBallCount = count;
            } else if (type === BoostType.DIAMOND) {
                diamondCount = count;
            }
            if (double) {
                if (splitCount > 0 || threeBallCount > 0) {
                    var self = this;
                    self.popupBoostRewardDlg(splitCount, threeBallCount, function () {
                        if (diamondCount > 0) {
                            self.popupAddDiamondsDlg(diamondCount, rewardName, cb);
                        } else {
                            cb && cb();
                        }
                    });
                } else {
                    if (diamondCount > 0) {
                        this.popupAddDiamondsDlg(diamondCount, rewardName, cb);
                    } else {
                        cb && cb();
                    }
                }
            } else {
                game.playerMan.addBoost(BoostType.SPLIT, splitCount);
                game.playerMan.addBoost(BoostType.THREE_BALL, threeBallCount);
                game.playerMan.addDiamonds(diamondCount, rewardName);
                cb && cb();
            }
        }.bind(this));
    }
});

StoreHelper._instance = null;
StoreHelper._firstUseInstance = true;

/**
 *
 * @returns {StoreHelper}
 */
StoreHelper.getInstance = function () {
    if (StoreHelper._firstUseInstance) {
        StoreHelper._firstUseInstance = false;
        StoreHelper._instance = new StoreHelper();
    }
    return StoreHelper._instance;
};

module.exports = StoreHelper;
},{"../../common/entity/PaymentInfo":7,"../../common/entity/ProductInfo":9,"../../common/enum/PaymentCode":11,"../config/ConfigMan":41,"../enum/BoostType":110,"../enum/SkinType":119,"../enum/StoreType":120,"../enum/WheelType":121,"../events/EventsName":122}],130:[function(require,module,exports){
var GameController = require("../controller/GameController");
var GameMan = require("../model/GameMan");
var StoreHelper = require("../model/StoreHelper");

var GameScene = cc.Scene.extend({
    _gameType: 0,
    _isBackClicked: false,

    ctor: function () {
        this._super();
        game.adsManager.removeBannerAds("bottom");
        game.gameMan.resetTryAnimItem();
        var gameNode = GameController.createFromCCB();
        this.addChild(gameNode);
    },

    onEnter:function () {
        this._super();
        StoreHelper.getInstance().init();
    },

    onExit: function () {
        game.dialogManager.closeAll();
        this._super();
    }
});

module.exports = GameScene;

},{"../controller/GameController":61,"../model/GameMan":124,"../model/StoreHelper":129}],131:[function(require,module,exports){
var MenuController = require("../controller/MenuController");
var StoreHelper = require("../model/StoreHelper");
var LevelController = require("../controller/LevelController");

var LevelScene = cc.Scene.extend({

    ctor: function () {
        this._super();
        var layer = LevelController.createFromCCB();
        this.addChild(layer);
    },

    onEnter:function () {
        this._super();

        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                if (keyCode === cc.KEY.back) {
                    if (!this._isBackClicked) {
                        this._isBackClicked = true;
                        game.sceneMan.switchScene(game.sceneType.MENU);
                    }
                }
            }.bind(this)
        }, this);

        if (game.gameMan.getMaxLevel() >= 3) {
            game.adsManager.showBannerAds("bottom");
        }
    },

    onExit: function () {
        game.dialogManager.closeAll();
        this._super();
    }
});

module.exports = LevelScene;
},{"../controller/LevelController":66,"../controller/MenuController":69,"../model/StoreHelper":129}],132:[function(require,module,exports){
/**
 * Created by oye on 15-4-19.
 */
var LoadingController = require("../controller/LoadingController");

var LoadingScene = cc.Scene.extend({
    ctor:function () {
        this._super();
        var layer = LoadingController.createFromCCB();
        this.addChild(layer);
    }
});

module.exports = LoadingScene;
},{"../controller/LoadingController":68}],133:[function(require,module,exports){
var MenuController = require("../controller/MenuController");
var StoreHelper = require("../model/StoreHelper");
var GameMan = require("../model/GameMan");
var PlayerMan = require("../model/PlayerMan");
var SceneMan = require("../model/SceneMan");
var SceneType = require("../enum/SceneType");
//var BricksView = require("../view/BricksView");

window.isFirstEnter = true;

var MenuScene = cc.Scene.extend({

    ctor: function () {
        this._super();

        var layer = MenuController.createFromCCB();
        this.addChild(layer);
    },

    onEnter:function () {
        this._super();

        StoreHelper.getInstance().init();

        var self = this;
        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                if (keyCode === cc.KEY.back) {
                    if (!self._isBackClicked) {
                        self._isBackClicked = true;
                        game.popupMan.popupYesNoCommonDlg(_("exit_game_confirm"), _("yes_title"), _("no_title"), function () {
                            game.logicMan.scheduleLocalNotification();
                            cc.director.end();
                        }, function () {
                            self._isBackClicked = false;
                        });
                    }
                }
            }
        }, this);

        if (game.gameMan.getMaxLevel() >= 3) {
            game.adsManager.showBannerAds("bottom");
        }

        if (game.adsManager.showTopBanner) {
            game.adsManager.removeBannerAds("top");
        }

        this.scheduleOnce(function () {
            game.gcManager.reportScore(0, game.config.getLeaderBoardKey());
            if (!window.isFirstEnter) {
                game.crossPromMan.tryToPopupCrossPromDlg();
            } else {
                window.isFirstEnter = false;
            }
        }, 1);
    },

    onExit: function () {
        game.dialogManager.closeAll();
        this._super();
    }
});

module.exports = MenuScene;
},{"../controller/MenuController":69,"../enum/SceneType":116,"../model/GameMan":124,"../model/PlayerMan":125,"../model/SceneMan":128,"../model/StoreHelper":129}],134:[function(require,module,exports){
var MenuController = require("../controller/MenuController");
var StoreHelper = require("../model/StoreHelper");
var PackageController = require("../controller/PackageController");

var PackageScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        var layer = PackageController.createFromCCB();
        this.addChild(layer);
    },

    onEnter:function () {
        this._super();

        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                if (keyCode === cc.KEY.back) {
                    if (!this._isBackClicked) {
                        this._isBackClicked = true;
                        game.sceneMan.switchScene(game.sceneType.MENU);
                    }
                }
            }.bind(this)
        }, this);
    },

    onExit: function () {
        game.dialogManager.closeAll();
        this._super();
    }
});

module.exports = PackageScene;
},{"../controller/MenuController":69,"../controller/PackageController":71,"../model/StoreHelper":129}],135:[function(require,module,exports){
var Grid = require("../entity/Grid");
var Ball = require("../entity/Ball");
var BoardController = require("../controller/BoardController");
var BallPool = require("../entity/BallPool");
var Utils = require("../../common/util/Utils");
var GridType = require("../enum/GridType");
var Board = require("../entity/Board");
var ShapeType = require("../enum/ShapeType");
var Boost = require("../entity/Boost");
var BoostType = require("../enum/BoostType");
var Obstacle = require("../entity/Obstacle");
var Wall = require("../entity/Wall");
var GameMan = require("../model/GameMan");
var StoreHelper = require("../model/StoreHelper");
var EventsName = require("../events/EventsName");
var ItemCategory = require("../enum/ItemCategory");

var ColorConfigs = [
    cc.color(252, 178, 0),
    cc.color(81, 229, 12),
    cc.color(27, 226, 255),
    cc.color(255, 252, 29),
    cc.color(255, 56, 56),
    cc.color(248, 70, 255),
    cc.color(255, 129, 17),
    cc.color(57, 103, 249),
    cc.color(90, 181, 110),

    cc.color(255, 90, 141),
    cc.color(242, 86, 9),
    cc.color(66, 46, 176),
    cc.color(144, 85, 222),
    cc.color(23, 167, 104),
    cc.color(176, 72, 206),
    cc.color(147, 192, 26),
    cc.color(55, 70, 219)
];


var GrayColor = cc.color(82, 82, 82);

var getColor = function (type) {
    return ColorConfigs[(type - 1) % ColorConfigs.length];
};

var GameStep = {
    PRE_START: 1,
    AIM_GUIDE: 2,
    START: 3,
    RELIFE: 4,
    FAIL_AND_WAIT_RELIFE: 5,
    END: 6
};

var BricksView = cc.Node.extend({
    SPACE_STEP: 1 / 60,
    LIFE_POSIBILITY: 0.005,
    BOOST_POSIBILITY: 0.06,
    MAX_SPEED: 420,
    MAX_LIFE: 4,
    BOOST_SPEED: 80,
    MAX_BALL: 800,
    TOP_INNER_WALL: 60,
    MAX_SPLIT_COUNT: 100,
    TOP_AD_WALL: 100,
    HINT_BALL: 200,
    HINT_GRAY_BALL: 150,
    //this.TOP_AD_WALL = 100;
    SPLIT_BALL_ANGLE: [45, 90, 135],
    MUST_GEN_BOOST_TIME: 20,

    /**
     * @type {LevelConfig}
     */
    config: null,

    row: 0,
    col: 0,

    ballList: null,

    gameStep: -1,

    lifeCount: 2,

    gameController: null,

    //startTime: 0,

    stoped: false,

    lastTime: 0,

    totalTime: 0,
    lastAdjustTime: 0,

    hardMode: false,

    accumulator: 0,
    boostTypeMap: null,
    lastGetBoostTime: 0,
    _curTouchId: -1,

    lastRemoveTime: 0,

    currentFPS: 60,

    isLowIOS: false,

    ctor: function (config, gameController) {
        this._super();
        if (game.utils.isLowAndroid()) {
            this.currentFPS = game.config.lowAndroidFPS;
        }
        this.isLowIOS = game.utils.isLowIOS();
        if (game.gameMan.levelId >= 30) {
            this.MAX_LIFE = 2;
        }
        this.WIN_WIDTH = cc.winSize.width;
        this.WIN_HEIGHT = cc.winSize.height;
        this.lastGetBoostTime = Date.now();
        this.boostTypeMap = {};
        this.boostTypeList = [BoostType.SPLIT, BoostType.THREE_BALL];
        if (cc.sys.os === cc.sys.OS_IOS && !this.isLowIOS) {
            this.MAX_BALL = 1000;
        }
        BallPool.setMaxPoolSize("ball", this.MAX_BALL);
        BallPool.setMaxPoolSize("brick", 2000);
        if (game.utils.isIOSNotchScreen()) {
            this.TOP_AD_WALL += 70;
        }
        this.hardMode = GameMan.getInstance().isHardMode();
        if (this.hardMode) {
            config = config.getHardCfg();
        }
        if (config.lifeProbability > 0) {
            this.LIFE_POSIBILITY *= config.lifeProbability;
        }
        if (config.boostProbability > 0) {
            this.BOOST_POSIBILITY *= GameMan.getInstance().getBoostProbability(config);
        }
        cc.log("this.BOOST_POSIBILITY:" + this.BOOST_POSIBILITY);
        this.gameController = gameController;
        this.config = config;
        this.row = config.width;
        this.col = config.height;

        this.GRID_WIDTH = config.pixelWidth / config.width * 0.7;
        this.GRID_HEIGHT = config.pixelHeight / config.height * 0.7;

        this.GAP_WIDTH = config.pixelWidth / config.width - this.GRID_WIDTH;
        this.GAP_HEIGHT = config.pixelHeight / config.height - this.GRID_HEIGHT;

        //顶部最小的能容纳整个球盘的空间
        var minBrickHeight = 600 + this.TOP_INNER_WALL + this.TOP_AD_WALL + 10;
        var maxBrickHeight = this.WIN_HEIGHT - minBrickHeight;

        if (game.utils.isIOSNotchScreen()) {
            this.BRICK_Y = Math.min(this.WIN_HEIGHT * 0.4, maxBrickHeight);
        } else {
            if (game.utils.isAndroidNotchScreen()) {
                this.BRICK_Y = Math.min(this.WIN_HEIGHT * 0.36, maxBrickHeight);
            } else {
                this.BRICK_Y = Math.min(this.WIN_HEIGHT * 0.3, maxBrickHeight);
            }
        }

        this.BOARD_Y = this.BRICK_Y - this.WIN_HEIGHT * 0.16;

        this.setContentSize(cc.winSize);

        this.init();
    },

    onEnter: function () {
        this._super();
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan.bind(this),
            onTouchMoved: this.onTouchMoved.bind(this),
            onTouchEnded: this.onTouchEnded.bind(this),
            onTouchCancelled: this.onTouchCancelled.bind(this)
        }, this);

        this.scheduleUpdate();

        this.space.setDefaultCollisionHandler(
            this.collisionBegin.bind(this),
            this.collisionPre.bind(this),
            this.collisionPost.bind(this),
            this.collisionSeparate.bind(this)
        );
        this.gameStep = GameStep.PRE_START;
        game.eventDispatcher.addCustomEventListener(cc.game.EVENT_HIDE, this.gameOnHide, this);
        game.eventDispatcher.addEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
        game.eventDispatcher.addEventListener(EventsName.SHOW_AIM_GUIDE, this.onShowAimGuide, this);

        this.showTopBannerAds();

        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                if (keyCode === cc.KEY.back) {
                    this.tryShowPause();
                }
            }.bind(this)
        }, this);

        game.gameMan.onGameStart();
    },

    onExit: function () {
        game.eventDispatcher.removeEventListener(EventsName.SHOW_AIM_GUIDE, this.onShowAimGuide, this);
        game.eventDispatcher.removeCustomEventListener(cc.game.EVENT_HIDE, this.gameOnHide, this);
        game.eventDispatcher.removeEventListener(EventsName.UPDATE_SKIN, this.onUpdateSkin, this);
        //this.space.removeCollisionHandler(ShapeType.BALL,
        //    ShapeType.BRICK);
        this.unscheduleUpdate();
        this.removeTopBannerAds();
        //BallPool.drainAllPools();
        this.space = null;
        this.ballList = null;
        this.boosts = null;
        this.obstacles = null;
        this.walls = null;
        this.bricks = null;
        this._super();
    },

    onUpdateSkin: function () {
        for (var i = 0; i < this.ballList.length; ++i) {
            this.ballList[i].updateSkin();
        }
    },

    gameOnHide: function () {
        if (this.gameStep === GameStep.START) {
            this.tryShowPause();
        }
    },

    tryShowPause: function () {
        if (!this.stoped) {
            if (this.gameController) {
                this.gameController.showPause();
            }
        }
    },

    init: function () {
        this.initWorld();
        this.initObstacles();
        this.initBricks();
        this.initBoard();
        this.initHintLines();

        this.ballList = [];
        this.boosts = [];

        this.lastAdjustTime = Date.now();
        this.lastRemoveTime = Date.now();
    },
    
    createDotNode: function () {
        var dot = new cc.Sprite("#skin_0.png");
        dot.scale = 0.2;
        dot.opacity = 150;
        dot.setColor(cc.color.GRAY);
        return dot;
    },

    initHintLines: function () {
        this.drawNode = new cc.Node();
        this.addChild(this.drawNode, this.HINT_GRAY_BALL);

        var skinCfg = GameMan.getInstance().getCurrentSkinCfg();
        this.hintSprite = new cc.Sprite("#" + skinCfg.image + ".png");
        this.addChild(this.hintSprite, this.HINT_BALL);
        this.hintSprite.visible = false;
        this.hintSprite.scale = this.getBallWidth() / this.hintSprite.width * skinCfg.scale;
	    this.dots = [];
        for (var i = 0; i < 30; i++) {
            var dot = this.createDotNode();
            this.dots.push(dot);
            dot.visible = false;
            this.drawNode.addChild(dot);
        }
    },

    initObstacles: function () {
        this.obstacles = [];
        this.walls = [];
        for (var i = 0; i < this.config.obstacles.length; ++i) {
            var obstacleCfg = this.config.obstacles[i];
            for (var x = 0; x < obstacleCfg.width; ++x) {
                for (var y = 0; y < obstacleCfg.height; ++y) {
                    var localCol = x + obstacleCfg.x;
                    var localRow = y + obstacleCfg.y;
                    var obstacle = BallPool.getFromPool("obstacle");
                    if (!obstacle) {
                        obstacle = new Obstacle(GrayColor, this.GRID_WIDTH, this.GRID_HEIGHT);
                    } else {
                        obstacle.reset(GrayColor, this.GRID_WIDTH, this.GRID_HEIGHT);
                    }
                    this.addChild(obstacle);
                    obstacle.setPosition(this.getGridPos(localRow, localCol));
                    this.obstacles.push(obstacle);
                }
            }
            var WALL_FILL_SIZE = cc.size(6, 6);
            var wall = new Wall();
            wall.setContentSize(cc.size(
                this.GRID_WIDTH * obstacleCfg.width + this.GAP_WIDTH * (obstacleCfg.width - 1) + WALL_FILL_SIZE.width,
                this.GRID_HEIGHT * obstacleCfg.height + this.GAP_HEIGHT * (obstacleCfg.height - 1) + WALL_FILL_SIZE.height));
            this.walls.push(wall);
            this.addChild(wall);
            var pos = cc.pAdd(this.getGridPos(obstacleCfg.y, obstacleCfg.x),
                cc.p(-0.5 * this.GRID_WIDTH, -0.5 * this.GRID_HEIGHT));
            pos = cc.pAdd(pos, cc.p(-WALL_FILL_SIZE.width * 0.5, -WALL_FILL_SIZE.height * 0.5));
            wall.initBody(this.space, pos);
        }
    },

    initBricks: function () {
        this.bricks = [];
        for (var i = 0; i < this.config.bricks.length; ++i) {
            var brickCfg = this.config.bricks[i];
            for (var x = 0; x < brickCfg.width; ++x) {
                for (var y = 0; y < brickCfg.height; ++y) {
                    var brick = this.createBrick(x, y, brickCfg);
                    this.bricks.push(brick);
                }
            }
        }
    },

    createBrick: function (x, y, brickCfg) {
        var localCol = x + brickCfg.x;
        var localRow = y + brickCfg.y;
        var brick = BallPool.getFromPool("brick");
        if (!brick) {
            brick = new Grid(getColor(brickCfg.type), this.GRID_WIDTH, this.GRID_HEIGHT, GridType.BRICK);
        } else {
            brick.reset(getColor(brickCfg.type), this.GRID_WIDTH, this.GRID_HEIGHT, GridType.BRICK);
        }
        this.addChild(brick);
        brick.initBody(this.space, this.getGridPos(localRow, localCol));
        return brick;
    },

    initBoard: function () {
        this.boardNode = new Board(this.getBallWidth());
        this.addChild(this.boardNode);
        this.boardNode.initBody(this.space, cc.p(this.WIN_WIDTH * 0.5, this.BOARD_Y));
    },

    getBallWidth: function () {
        return Math.max(this.GRID_WIDTH, 8);
    },

    initWorld: function () {
        this.WALL_THICK = 50;
        this.INNER_WALL = 20;
        //this.TOP_INNER_WALL = 50;
        this.space = new cp.Space();
        var xOffset = 0;
        if (window.isEditor) {
            xOffset = cc.winSize.width - 640;
        }
        var walls = [
            {
                "shape": cc.size(this.WIN_WIDTH + this.WALL_THICK, this.WALL_THICK), //bottom
                "pos": cp.v(this.WIN_WIDTH * 0.5 - this.WALL_THICK * 0.5, -this.WALL_THICK * 0.5 + this.INNER_WALL)
            },
            {
                "shape": cc.size(this.WIN_WIDTH + this.WALL_THICK, this.WALL_THICK), //top
                "pos": cp.v(this.WIN_WIDTH * 0.5 - this.WALL_THICK * 0.5, this.WIN_HEIGHT + this.WALL_THICK * 0.5 - this.TOP_INNER_WALL - this.TOP_AD_WALL)
            },
            {
                "shape": cc.size(this.WALL_THICK, this.WIN_HEIGHT + this.WALL_THICK), //left
                "pos": cp.v(xOffset * 0.5 - this.WALL_THICK * 0.5 + this.INNER_WALL, this.WIN_HEIGHT * 0.5 - this.WALL_THICK * 0.5)
            },
            {
                "shape": cc.size(this.WALL_THICK, this.WIN_HEIGHT + this.WALL_THICK), //right
                "pos": cp.v(-xOffset * 0.5 + this.WIN_WIDTH + this.WALL_THICK * 0.5 - this.INNER_WALL, this.WIN_HEIGHT * 0.5 - this.WALL_THICK * 0.5)
            }
        ];

        for (var i = 0; i < walls.length; i++) {
            var body = new cp.Body(Infinity, Infinity);
            var wall = walls[i];
            var shape = new cp.BoxShape(body, wall.shape.width, wall.shape.height);
            shape.setElasticity(1);
            shape.setFriction(0);
            //shape.layers = 1;
            body.setPos(wall.pos);
            this.space.addStaticShape(shape);
        }

        //for (var i = 0; i < walls.length; i++) {
        //    var body = new cp.Body(Infinity, Infinity);
        //    var wall = walls[i];
        //    var shape = new cp.BoxShape(body, wall.shape.width, wall.shape.height);
        //    shape.setElasticity(1);
        //    shape.setFriction(0);
        //    shape.layers = HINT_WALL_GROUP;
        //    body.setPos(wall.pos);
        //    this.space.addStaticShape(shape);
        //}

        // Gravity
        this.space.gravity = cp.v(0, 0);
        this.space.sleepTimeThreshold = 0.5;
        this.space.collisionSlop = 0.5;
        this.space.iterations = 5;
        if (cc.sys.isNative) {
            this.space.useSpatialHash(this.getBallWidth(), this.MAX_BALL * 10);
        }

        //this.initDebugMode();
    },

    initDebugMode: function () {
        this._debugNode = cc.PhysicsDebugNode.create(this.space);
        this.addChild(this._debugNode);
    },

    getGridPos: function (localRow, localCol) {
        var gridSize = this.getGridSize();
        return cc.p((this.WIN_WIDTH - this.config.pixelWidth) * 0.5 + (gridSize.width + this.GAP_WIDTH) * (localCol + 0.5),
            (gridSize.height + this.GAP_HEIGHT) * (localRow + 0.5) + this.BRICK_Y);
    },

    getGridSize: function () {
        if (!this.lastGridSize) {
            this.lastGridSize = cc.size(this.GRID_WIDTH, this.GRID_HEIGHT);
        }
        return this.lastGridSize;
    },

    update: function (dt) {
        if (this.stoped) {
            return;
        }
        switch (this.gameStep) {
            case GameStep.PRE_START:

                break;
            case GameStep.START:
                //var t1 = Date.now();
                this.updateTime(dt);
                //var t2 = Date.now();
                //cc.log("update start t2:" + (t2 - t1));
                this.updateGrids(dt);
                //var t3 = Date.now();
                //cc.log("update start t3:" + (t3 - t2));
                this.updateChipmunk(dt);
                //var t4 = Date.now();
                //cc.log("update start t4:" + (t4 - t3));
                this.updateBoost(dt);
                //var t5 = Date.now();
                //cc.log("update start t5:" + (t5 - t4));
                this.checkGameOver();
                //var t6 = Date.now();
                //cc.log("update start t6:" + (t6 - t5));
                break;
            case GameStep.RELIFE:
                 if (this.gameController) {
                     this.gameController.updateLifeCount();
                 }
                this.removeAllBoosts();
                this.boardNode.showBall();
                this.gameStep = GameStep.PRE_START;
                break;
            case GameStep.END:
                this.updateChipmunk(dt);
                break;

            case GameStep.AIM_GUIDE:
                var worldPosition = this.gameController.ndAimHelp.controller.getHandWorldPosition();
                if (!this.lastAimHelpPosition) {
                    this.lastAimHelpPosition = worldPosition;
                }
                var offset = (worldPosition.x - this.lastAimHelpPosition.x);
                if (Math.abs(offset) > 10) {
                    this.clearHintNode();
                    this.drawAimLine(worldPosition);
                }
                break;
        }
    },

    updateTime: function (dt) {
        if (!this.eclipsedTime) {
            this.eclipsedTime = 0;
        }
        this.eclipsedTime += dt * 1000;
        if (this.gameController) {
            this.gameController.updateTime();
        }
    },

    updateBalls: function (dt) {
        var removeCount = 0;
        var canRemove = (Date.now() - this.lastRemoveTime) > 200;
        if (!canRemove) {
            if (this.ballList.length <= 2) {
                canRemove = true;
            }
        }
        var i, ball;
        if (canRemove) {
            this.lastRemoveTime = Date.now();
            //cc.log("update balls :" + canRemove + ", ball count:" + this.ballList.length);
            for (i = this.ballList.length - 1; i >= 0; --i) {
                ball = this.ballList[i];
                var position = ball.getPosition();
                if (position.y < this.BOARD_Y - 40 || !this.isInView(position)) {
                    this.removeBall(ball);
                    removeCount++;
                }
            }
        }
        if (Date.now() - this.lastAdjustTime > 1000) {
            this.lastAdjustTime = Date.now();
            for (i = this.ballList.length - 1; i >= 0; --i) {
                ball = this.ballList[i];
                this.adjustBallSpeed(ball);
            }
        }
    },

    adjustBallSpeed: function (ball) {
        var vel = ball.getVel();
        var distance = cc.pLength(vel);
        if (distance < this.MAX_SPEED * 0.9 || distance > this.MAX_SPEED * 1.1) {
            var radian;
            if (vel.x > 0) {
                radian = Math.atan(vel.y / vel.x);
            } else {
                radian = Math.atan(vel.y / vel.x) + Math.PI;
            }
            ball.setVel(cc.p(this.MAX_SPEED * Math.cos(radian), this.MAX_SPEED * Math.sin(radian)));
        }
    },

    randomBallSpeed: function (ball) {
        this.adjustBallSpeed(ball);
        if (!ball._lastRandomTime) {
            ball._lastRandomTime = Date.now();
        }
        //more than 5 seconds,then try to adjust ball speed.
        if (Date.now() - ball._lastRandomTime >= 5000) {
            //cc.log("brick view:adjust ball speed:" + (Date.now() - ball._lastRandomTime));
            ball._lastRandomTime = Date.now();
            this.randomAdjustBallSpeed(ball);
        }
    },

    updateGrids: function (dt) {
        for (var i = this.bricks.length - 1; i >= 0; --i) {
            var brick = this.bricks[i];
            if (brick.removeable) {
                this.removeBrick(brick);
            }
        }
    },

    updateChipmunk: function (dt) {
        //var t1 = Date.now();
        var delta = this.currentFPS;
        if (cc.sys.os === cc.sys.OS_ANDROID || this.isLowIOS) {
            if (this.ballList.length > 20) {
                this.space.step(1 / delta);
            } else {
                for (var i = 0; i < 2; ++i) {
                    this.space.step(1 / delta / 2);
                }
            }
        } else {
            if (this.ballList.length > 50) {
                this.space.step(1 / delta);
            } else if (this.ballList.length > 20) {
                for (var i = 0; i < 2; ++i) {
                    this.space.step(1 / delta / 2);
                }
            } else {
                for (var i = 0; i < 3; ++i) {
                    this.space.step(1 / delta / 3);
                }
            }
        }
        //var t2 = Date.now();
        //cc.log("update t2:" + (t2 - t1));
        this.updateBalls(dt);
        //var t3 = Date.now();
        //cc.log("update t3:" + (t3 - t2));
    },

    randomAdjustBallSpeed: function (ball) {
        var RANDOM_MAX_COUNT = 60;
        var random1 = game.utils.rangeNextNumber(-RANDOM_MAX_COUNT * 0.5, RANDOM_MAX_COUNT * 0.5);
        var random2 = game.utils.rangeNextNumber(-RANDOM_MAX_COUNT * 0.5, RANDOM_MAX_COUNT * 0.5);
        ball.setVel(cc.pAdd(ball.getVel(), cc.p(random1, random2)));
    },

    updateBoost: function (dt) {
        for (var i = this.boosts.length - 1; i >= 0; --i) {
            var boost = this.boosts[i];
            boost.y -= dt * this.BOOST_SPEED;
            if (cc.rectIntersectsRect(boost.getBoundingBox(), this.boardNode.getBoundingBox())) {
                switch (boost.type) {
                    case BoostType.LIFE:
                        this.onAddLife();
                        break;
                    case BoostType.SPLIT:
                        this.useSplitBallBoost();
                        break;
                    case BoostType.THREE_BALL:
                        this.useNew3BallBoost();
                        break;
                    case BoostType.BOMB:
                        this.useBombBoost();
                        break;
                }
                this.boosts.splice(i, 1);
                boost.removeFromParent();
            } else if (boost.y < 0) {
                this.boosts.splice(i, 1);
                boost.removeFromParent();
            }
        }
    },

    useSplitBallBoost: function () {
        this.tryShootFirstBall(cc.p(0, 1));
        game.audioPlayer.playEffectByKey("boost_add");
        game.audioPlayer.vibrateShort();
        // var t1 = Date.now();
        for (var j = this.ballList.length - 1; j >= 0; --j) {
            var ball = this.ballList[j];
            this.onSplitBall(ball.getPosition());
            if (this.ballList.length > this.MAX_BALL) {
                break;
            }
        }
        // var t2 = Date.now();
        //cc.log("split ball time:" + (t2 - t1));
    },

    useNew3BallBoost: function () {
        this.tryShootFirstBall(cc.p(0, 1));
        game.audioPlayer.playEffectByKey("boost_add");
        this.onShoot3Ball();
        game.audioPlayer.vibrateShort();
    },

    useBombBoost: function () {
        //stop game and play end animation.
        this.watchAdAndRelife();
    },

    onAddLife: function () {
        this.lifeCount++;
        if (this.gameController) {
            this.gameController.updateLifeCount();
        }
        game.audioPlayer.playEffectByKey("life_add");
        game.audioPlayer.vibrateShort();
    },

    onSplitBall: function (position) {
        var vel = this.MAX_SPEED;
        for (var i = 0; i < 3; ++i) {
            var angle = game.utils.randomNextInt(90);
            var symbol1 = (game.utils.randomNextInt(2) === 1 ? 1 : -1);
            var symbol2 = (game.utils.randomNextInt(2) === 1 ? 1 : -1);
            var x = 10,y = 10;
            var randomPos = cc.pAdd(position, cc.p(-x / 2 + x * game.utils.randomNextNumber(1),
                -y / 2 + y * game.utils.randomNextNumber(1)));
            this.shootBall(randomPos, cc.p(symbol1 * vel * Math.sin(Math.PI / 180 * angle),
                    symbol2 * vel * Math.cos(Math.PI / 180 * angle)));
        }
    },

    onShoot3Ball: function () {
        var vel = this.MAX_SPEED;
        for (var i = 0; i < 3; ++i) {
            var speed = cc.p(vel * Math.cos(Math.PI / 180 * this.SPLIT_BALL_ANGLE[i]),
                vel * Math.sin(Math.PI / 180 * this.SPLIT_BALL_ANGLE[i]));
            this.shootBall(this.getInitBallPos(), speed);
        }
    },

    switchPassDlg: function () {
        game.audioPlayer.playEffectByKey("victory");
        setTimeout(function () {
            game.popupMan.popupPassDlg(function () {
                GameMan.getInstance().resumeGame();
                game.sceneMan.switchScene(game.sceneType.GAME);
            }, function () {
                if (GameMan.getInstance().hasNextLevel()) {
                    game.sceneMan.switchScene(game.sceneType.GAME);
                } else {
                    game.popupMan.popupCommonDlg(game.local.getValue("all_completed"), function () {
                        game.sceneMan.switchScene(game.sceneType.LEVEL);
                    });
                }
            });
        }, 500);
    },

    checkGameOver: function () {
        var self = this;
        if (this.bricks.length === 0) {
            if (window.isEditor) {
                return;
            }
            //return;
            this.gameStep = GameStep.END;
            this.showBannerAds();
            var levelId = GameMan.getInstance().levelId;
            GameMan.getInstance().gameWin(this.eclipsedTime / 1000);
            var star = GameMan.getInstance().currentStar;
            if (star < 3) {
                game.popupMan.popupGet3Star("3_star", function (watched) {
                    if (watched) {
                        game.gameMan.onWatchAdsGet3Star(levelId);
                        self.switchPassDlg();
                    } else {
                        self.switchPassDlg();
                    }
                });
            } else {
                this.switchPassDlg();
            }
        } else if (this.ballList.length === 0) {
            if (this.lifeCount > 0) {
                this.lifeCount--;
                this.gameStep = GameStep.RELIFE;
            } else {
                if (game.adsManager.isRewardVideoReady()) {
                    this.gameStep = GameStep.FAIL_AND_WAIT_RELIFE;
                    game.popupMan.popupRelife(function (relife) {
                        if (relife) {
                            self.watchAdAndRelife();
                        } else {
                            self.switchToFail();
                        }
                    });
                } else {
                    self.switchToFail();
                }
            }
        }
    },

    watchAdAndRelife: function () {
        var self = this;
        StoreHelper.getInstance().checkAndShowRewardVideo(game.utils.isIOS() ? "fuhuo01" : "fuhuo01", function (rewarded) {
            if (rewarded) {
                game.analyseManager.trackEvent("WatchAdsToRelife");
                self.switchToRelife();
            } else {
                self.switchToFail();
            }
        });
    },

    //switchToWaitFail: function () {
    //    var self = this;
    //    this.gameStep = GameStep.FAIL_AND_WAIT_RELIFE;
    //    game.popupMan.popupReliveDlg(function () {
    //        self.switchToRelife();
    //    }, function () {
    //        self.switchToFail();
    //    });
    //},

    switchToRelife: function () {
        this.lifeCount = 2;
        this.gameStep = GameStep.RELIFE;
    },

    switchToFail: function () {
        if (window.isEditor) {
            this.switchToRelife();
        } else {
            GameMan.getInstance().onGameFail();
            this.gameStep = GameStep.END;
            game.popupMan.popupFailDlg(function () {
                game.sceneMan.switchScene(game.sceneType.GAME);
            }, function () {
                GameMan.getInstance().skipLevel();
                game.sceneMan.switchScene(game.sceneType.GAME);
            });
        }
    },

    isInView: function (worldPos) {
        if (worldPos.x < 0 || worldPos.x > this.WIN_WIDTH || worldPos.y < 0 || worldPos.y > this.WIN_HEIGHT) {
            return false;
        }
        return true;
    },

    onShowAimGuide: function (event) {
        this.showAimGuideAnimation();
    },

    showAimGuideAnimation: function () {
        this.gameController.ndAimHelp.visible = true;
        this.gameStep = GameStep.AIM_GUIDE;
    },

    tryShootFirstBall: function (direction) {
        if (this.gameStep === GameStep.PRE_START && direction) {
            this.gameStep = GameStep.START;
            this.shootBall(this.getInitBallPos(), cc.p(direction.x * this.MAX_SPEED, direction.y * this.MAX_SPEED));
            this.boardNode.hideBall();
        }
    },

    getReflectionNormal: function (start, hitPoint, n) {
        var ao = cc.pSub(hitPoint, start);
        var dot = cc.pDot(ao, n);
        var ob = cc.pSub(ao, cc.pMult(n, 2 * dot));
        var normalOb = cc.pNormalize(ob);
        cc.log("reflection normal:" + JSON.stringify(normalOb));
        return normalOb;
    },

    canShoot: function (touchLocation) {
        var start = this.getInitBallPos();
        if (touchLocation.y < start.y + 15) {
            return false;
        }
        return true;
    },

    drawDashNode: function (start, end, startCount) {
        var count = startCount;
        game.utils.getDashPointsNode(this.drawNode, [start, end], [20], 20, function (x1, y1) {
            if (!this.dots[count]) {
                var node = this.createDotNode();
                this.dots.push(node);
                this.drawNode.addChild(node);
            }
            this.dots[count].visible = true;
            this.dots[count++].setPosition(cc.p(x1, y1));
        }.bind(this));
        return count;
    },

    onTouchBegan:function(touch, event) {
        //cc.log("brick view onTouchBegan:" + touch.getID());
        if (this._curTouchId > 0) {
            return false;
        }
        this._curTouchId = touch.getID();
        if (this.gameController && this.gameController.ndHelp.visible) {
            this.gameController.ndHelp.visible = false;
            game.storageController.setItem("first_enter", "false");
            return false;
        }

        if (this.gameController && this.gameController.ndAimHelp.visible) {
            this.gameController.ndAimHelp.visible = false;
            this.clearHintNode();
            this.gameStep = GameStep.PRE_START;
        }

        this.lastTouchPos = this.getParent().convertToNodeSpace(touch.getLocation());
        this.lastDirection = cc.p(0, 1);
        this.gameController.ndAnimItem.controller.playHideAnim();
        return true;
    },

    onTouchMoved:function(touch, event) {
        if (touch.getID() !== this._curTouchId) {
            return false;
        }
        var touchLocation = this.getParent().convertToNodeSpace(touch.getLocation());
        if (this.lastTouchPos) {
            var offset = (touchLocation.x - this.lastTouchPos.x);
            if (Math.abs(offset) > 0.5) {
                if (game.gameMan.canUseAimItem()) {
                    if (this.gameStep === GameStep.PRE_START) {
                        this.clearHintNode();
                        this.lastDirection = this.drawAimLine(touchLocation);
                    } else {
                        this.moveBoard(offset);
                    }
                } else {
                    this.moveBoard(offset);
                }
                this.lastTouchPos = touchLocation;
            }
        }
        return true;
    },

    drawAimLine: function (touchLocation) {
        var start = this.getInitBallPos();
        if (!this.canShoot(touchLocation)) {
            //touchLocation = cc.p(start.x, cc.winSize.height);
            return null;
        }
        var direction = cc.pNormalize(cc.pSub(touchLocation, start));
        var end = cc.pAdd(start, cc.pMult(direction, cc.winSize.height + cc.winSize.width));
        var radius = 10;
        var info = this.space.segmentQueryFirst(start, end, radius, {
            group: cp.NO_GROUP,
            categories: cp.ALL_CATEGORIES,
            mask: ItemCategory.Wall
        });
        if (info) {
            var hintPoint = info.point;
            var nextStartCount = this.drawDashNode(start, hintPoint, 0);
            var reflectionNormal = this.getReflectionNormal(start, hintPoint, info.normal);
            var reflectionPoint = cc.pAdd(hintPoint, cc.pMult(reflectionNormal, 80));
            this.drawDashNode(hintPoint, reflectionPoint, nextStartCount);
            this.hintSprite.visible = true;
            this.hintSprite.setPosition(hintPoint);
            return direction;
        } else {
            //return cc.p(0, 1);
            return null;
        }
    },

    moveBoard: function (offset) {
        var X_OFFSET = this.INNER_WALL + this.getBallWidth() * 0.5 + 2;
        var x = this.boardNode.x + offset * 1.6;
        if (x < X_OFFSET) {
            x = X_OFFSET;
        } else if (x > cc.winSize.width - X_OFFSET) {
            x = cc.winSize.width - X_OFFSET;
        }
        this.boardNode.setPosX(x);
    },

    onTouchEnded:function(touch, event) {
        //cc.log("brick view onTouchEnded:" + touch.getID());
        if (touch.getID() !== this._curTouchId) {
            return false;
        }
        if (game.gameMan.canUseAimItem()) {
            if (this.gameStep === GameStep.PRE_START) {
                this.tryShootFirstBall(this.lastDirection);
                this.clearHintNode();
            }
        } else {
            this.tryShootFirstBall(cc.p(0, 1));
        }
        this.lastSelectGrid = null;
        this.lastTouchPos = null;
        this._curTouchId = -1;
        this.lastDirection = null;
    },

    onTouchCancelled:function(touch, event) {
        //cc.log("brick view onTouchCancelled:" + touch.getID());
        this.onTouchEnded(touch, event);
    },

    clearHintNode: function () {
        for (var i = 0; i < this.dots.length; ++i) {
            this.dots[i].visible = false;
        }
        this.hintSprite.visible = false;
    },

    collisionBegin : function ( arbiter, space ) {
        //cc.log('collision begin');
        return true;
    },

    collisionPre : function ( arbiter, space ) {
        //cc.log('collision pre');
        var shapes = arbiter.getShapes();
        for (var i = 0; i < shapes.length; ++i) {
            var shape = shapes[i];
            //cc.log("collision pre shape collision type:" + shape.collision_type);
            if (shape.collision_type == ShapeType.BRICK) {
                var body = shape.getBody();
                if (body.userData) {
                    //cc.log("body.userData:" + body.userData.name);
                    body.userData.removeable = true;
                    this.generateBoost(body.userData.getPosition());
                }
            } else if (shape.collision_type == ShapeType.BALL) {
                if (this.gameStep === GameStep.START) {
                    this.playKnockAudio();
                }
            }
        }
        return true;
    },

    collisionPost : function ( arbiter, space ) {
        //cc.log('collision post');
    },

    collisionSeparate : function ( arbiter, space ) {
        //cc.log('collision separate');
        var shapes = arbiter.getShapes();
        var ballShape = null;
        var boardShape = null;
        for (var i = 0; i < shapes.length; ++i) {
            //cc.log("collision separate shape collision type:" + shapes[i].collision_type);
            if (shapes[i].collision_type == ShapeType.BALL) {
                var body = shapes[i].getBody();
                if (body && body.userData) {
                    this.randomBallSpeed(body.userData);
                }
                ballShape = shapes[i];
            } else if (shapes[i].collision_type == ShapeType.BOARD) {
                boardShape = shapes[i];
            }
        }
        if (ballShape && boardShape) {
            //cc.log("board collision 1");
            if (ballShape.body && ballShape.body.userData && boardShape.body && boardShape.body.userData) {
                //cc.log("board collision 2");
                var ball = ballShape.body.userData;
                var board = boardShape.body.userData;
                //cc.log("board collision 2 ball.getPosition().y:" + ball.getPosition().y);
                //cc.log("board collision 2 board.y + board.height * 0.5:" + (board.y + board.height * 0.5 - 10));
                if (ball.getPosition().y < board.y + board.height * 0.5 - 10) {
                    return;
                }
                //cc.log("board collision 3");
                var boardShapeX1 = ball.getPosition().x - (board.x - board.width / 2);
                var x = boardShapeX1 / boardShape.body.userData.width * 100 / 50 - 1;
                x = Math.max(Math.min(0.9, x), -0.9);
                //cc.log("board collision 4:" + x);
                var y = Math.sqrt(1 - x * x);
                ball.setVel(cc.p(this.MAX_SPEED * x, this.MAX_SPEED * y));
            }
        }
    },

    playKnockAudio: function () {
        if (Date.now() - this.lastTime > 50) {
            this.lastTime = Date.now();
            game.audioPlayer.playEffectByKey("knock");
        }
    },

    getInitBallPos: function () {
        return cc.pAdd(this.boardNode.getPosition(), cc.p(0, 20));
    },

    shootBall: function (position, vel) {
        if (this.ballList.length > this.MAX_BALL) {
            return;
        }
        var ball = BallPool.getFromPool("ball");
        if (!ball) {
            ball = new Ball(this.getBallWidth());
        } else {
            ball.reset(this.getBallWidth());
        }
        this.addChild(ball);
        this.ballList.push(ball);
        ball.initBody(this.space, position);
        ball.setVel(vel);
    },

    removeBall: function (ball) {
        var index = this.ballList.indexOf(ball);
        if (index > -1) {
            this.ballList.splice(index, 1);
        }
        ball.removeBody();
        BallPool.putInPool("ball", ball);
        ball.removeFromParent();
    },

    removeBrick: function (brick) {
        var index = this.bricks.indexOf(brick);
        if (index > -1) {
            this.bricks.splice(index, 1);
        }
        brick.removeBody();
        //if (brick.isGift) {
        //    this.stop();
        //    game.popupMan.popupRewardGift(function () {
        //        this.resume();
        //    }.bind(this));
        //} else {
        BallPool.putInPool("brick", brick);
        //}
        brick.removeFromParent();
    },

    getMinGenerateBoostType: function () {
        //boostTypeList
        var minBoostType = 0;
        var minBoostCount = 1000000;
        for (var i = 0; i < this.boostTypeList.length; ++i) {
            var boostType = this.boostTypeList[i];
            var boostCount = this.boostTypeMap[boostType] || 0;
            if (boostCount < minBoostCount) {
                minBoostType = boostType;
                minBoostCount = boostCount;
            }
        }
        return minBoostType;
    },

    getEstimatedBallCount: function () {
        var ballCount = this.ballList.length;
        for (var i = 0; i < this.boosts.length; ++i) {
            if (this.boosts[i].y < this.boardNode.y - 30) {
                continue;
            }
            if (this.boosts[i].type === BoostType.SPLIT) {
                ballCount = ballCount * 4;
            } else if (this.boosts[i].type === BoostType.THREE_BALL) {
                ballCount += 3;
            }
        }
        return ballCount;
    },

    generateBoost: function (pos) {
        var boostType;

        var hasBoost = false;
        if (this.hardMode) {
            hasBoost = game.utils.randomNextInt(400) < 400 * this.BOOST_POSIBILITY / this.ballList.length;
        } else {
            hasBoost = game.utils.randomNextInt(100) < 100 * this.BOOST_POSIBILITY / this.ballList.length;
        }

        if (this.bricks.length < 10) {
            if (!hasBoost) {
                if (this.hardMode) {
                    hasBoost = game.utils.randomNextInt(400) < 400 * this.BOOST_POSIBILITY / this.bricks.length;
                } else {
                    hasBoost = game.utils.randomNextInt(100) < 100 * this.BOOST_POSIBILITY / this.bricks.length;
                }
            }
        }
        // this.bricks.length

        if (GameMan.getInstance().levelId <= 3) {
            if (cc.isUndefined(this.generateBoostCount)) {
                this.generateBoostCount = 0;
            }
            if (this.generateBoostCount < 3) {
                hasBoost = true;
                this.generateBoostCount++;
            }
        }

        //protect gen boost.
        if (!hasBoost && (Date.now() - this.lastGetBoostTime > this.MUST_GEN_BOOST_TIME * 1000)) {
            hasBoost = true;
            cc.log("bricks-view must gen boost time");
        }

        if (hasBoost) {
            this.lastGetBoostTime = Date.now();
            boostType = this.getMinGenerateBoostType();
            this.boostTypeMap[boostType] = (this.boostTypeMap[boostType] || 0) + 1;
            if (this.getDroppingBoostCount(boostType) >= 5) {
                hasBoost = false;
            }
        }

        var hasLife = false;

        if (!hasBoost) {
            hasLife = game.utils.randomNextNumber(100) < (100 * this.LIFE_POSIBILITY / this.ballList.length);
            if (hasLife) {
                var lifeBoostCount = 0;
                for (var i = 0; i < this.boosts.length; ++i) {
                    if (this.boosts[i].type === BoostType.LIFE) {
                        lifeBoostCount++;
                    }
                }
                if (this.lifeCount + lifeBoostCount >= this.MAX_LIFE) {
                    hasLife = false;
                } else {
                    boostType = BoostType.LIFE;
                }
            }
        }

        if (hasLife || hasBoost) {
            var boost = new Boost(boostType);
            boost.setPosition(pos);
            this.addChild(boost);
            this.boosts.push(boost);
            this.boosts.sort(function (a, b) {
                return (a.y - b.y);
            });
        }
    },

    getDroppingBoostCount: function (type) {
        var count = 0;
        for (var i = 0; i < this.boosts.length; ++i) {
            if (this.boosts[i].type === type) {
                count++;
            }
        }
        return count;
    },

    onRemoveBoost: function (boost) {
        var index = this.boosts.indexOf(boost);
        if (index > -1) {
            this.boosts.splice(index, 1);
            boost.removeFromParent();
        }
    },

    removeAllBoosts: function () {
        for (var i = 0; i < this.boosts.length; ++i) {
            var boost = this.boosts[i];
            if (boost) {
                boost.removeFromParent();
            }
        }
        this.boosts = [];
    },

    stop: function () {
        this.stoped = true;
        //this.showBannerAds();
        if (game.adsManager.showTopBanner) {
            game.adsManager.removeBannerAds("top");
        }
    },

    resume: function () {
        this.stoped = false;
        //game.adsManager.removeBannerAds("bottom");
        if (game.adsManager.showTopBanner) {
            game.adsManager.showBannerAds("top");
        }
    },

    showBannerAds: function () {
        //if (game.playerMan.getLevel() >= 3) {
        //    game.adsManager.showBannerAds("bottom");
        //}
    },

    showTopBannerAds: function () {
        if (game.gameMan.getMaxLevel() >= 3) {
            if (game.adsManager.showTopBanner) {
                //if 1 > 0
                if (game.playerMan.getRegisterDay() > game.adsManager.topBannerDay) {
                    game.adsManager.showBannerAds("top");
                }
            }
        }
    },

    removeTopBannerAds: function () {
        //if (game.adsManager.showTopBanner) {
        //    game.adsManager.removeBannerAds("top");
        //}
    }
});

module.exports = BricksView;
},{"../../common/util/Utils":35,"../controller/BoardController":54,"../entity/Ball":102,"../entity/BallPool":103,"../entity/Board":104,"../entity/Boost":105,"../entity/Grid":106,"../entity/Obstacle":107,"../entity/Wall":109,"../enum/BoostType":110,"../enum/GridType":112,"../enum/ItemCategory":113,"../enum/ShapeType":117,"../events/EventsName":122,"../model/GameMan":124,"../model/StoreHelper":129}]},{},[37])