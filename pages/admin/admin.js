// pages/admin/admin.js
const app = getApp();
const xlsx = require('../../libs/xlsx.min.js');

Page({
  data: {
    isLogin: false,
    adminPwd: '',
    phoneList: '',
    phoneMap: {},
    fileName: '',
    fileTempPath: ''
  },

  onLoad() {
    this.loadCloudData();
  },

  // 加载云数据库数据
  loadCloudData() {
    wx.cloud.callFunction({
      name: 'queryPhone',
      data: { feature: '' },
      success: (res) => {
        const phoneMap = res.result.success ? res.result.phoneMap || {} : {};
        this.setData({ phoneMap });
        app.globalData.harassmentPhoneMap = phoneMap;
      },
      fail: (err) => {
        console.error('加载云数据失败', err);
        const storedData = wx.getStorageSync('harassmentPhoneMap') || {};
        this.setData({ phoneMap: storedData });
      }
    });
  },

  // 输入管理员密码
  inputPwd(e) {
    this.setData({ adminPwd: e.detail.value });
  },

  // 验证管理员密码
  checkPwd() {
    const { adminPwd } = this.data;
    const correctPwd = app.globalData.adminPwd || 'SRCX2026';
    
    if (adminPwd !== correctPwd) {
      wx.showToast({ title: '密码错误', icon: 'none' });
      return;
    }
    this.setData({ isLogin: true });
    wx.showToast({ title: '登录成功' });
  },

  // 手动输入导入
  inputPhoneList(e) {
    this.setData({ phoneList: e.detail.value });
  },

  importPhone() {
    let { phoneList, phoneMap } = this.data;
    if (!phoneList) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    // 数据清洗
    const cleanStr = phoneList
      .replace(/[，。、；：""''\s\n\t]/g, ',')
      .replace(/,+/g, ',')
      .replace(/^,|,$/g, '');
    const phones = cleanStr.split(',').map(p => p.trim()).filter(p => p);
    if (phones.length === 0) {
      wx.showToast({ title: '未识别到有效手机号', icon: 'none' });
      return;
    }

    // 校验+去重
    let successCount = 0, failCount = 0, repeatCount = 0;
    const tempMap = JSON.parse(JSON.stringify(phoneMap));

    phones.forEach(phone => {
      if (!/^1\d{10}$/.test(phone)) {
        failCount++;
        return;
      }
      const feature = phone.substring(0, 3) + phone.substring(6);
      if (!tempMap[feature]) tempMap[feature] = [];
      if (tempMap[feature].includes(phone)) {
        repeatCount++;
        return;
      }
      tempMap[feature].push(phone);
      successCount++;
    });

    // 上传
    wx.showLoading({ title: '上传中...' });
    wx.cloud.callFunction({
      name: 'importPhone',
      data: { phoneMap: tempMap },
      success: (res) => {
        wx.hideLoading();
        if (res.result.success) {
          app.globalData.harassmentPhoneMap = tempMap;
          wx.setStorageSync('harassmentPhoneMap', tempMap);
          this.setData({ phoneMap: tempMap, phoneList: '' });
          wx.showModal({
            title: '导入结果',
            content: `共识别${phones.length}条\n✅ 成功：${successCount}\n❌ 无效：${failCount}\n🔄 重复：${repeatCount}`,
            showCancel: false
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  // 选择Excel文件
  chooseExcelFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 50 * 1024 * 1024) {
          wx.showToast({ title: '文件不能超过50MB', icon: 'none' });
          return;
        }
        this.setData({ fileName: file.name, fileTempPath: file.path });
        wx.showToast({ title: '文件选择成功' });
      },
      fail: () => {
        wx.showToast({ title: '文件选择失败', icon: 'none' });
      }
    });
  },

  // Excel解析入口
  importExcelPhone() {
    const { fileTempPath, phoneMap } = this.data;
    if (!fileTempPath) {
      wx.showToast({ title: '请先选择Excel文件', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '解析Excel...' });
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: fileTempPath,
      encoding: 'binary',
      success: (res) => {
        try {
          const workbook = xlsx.read(res.data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

          // 提取所有11位手机号
          const phones = [];
          rows.forEach(row => {
            if (!row) return;
            row.forEach(cell => {
              if (!cell) return;
              const val = String(cell).trim();
              if (/^1\d{10}$/.test(val)) phones.push(val);
            });
          });

          // 全局去重
          const uniquePhones = Array.from(new Set(phones));
          wx.hideLoading();

          if (uniquePhones.length === 0) {
            wx.showToast({ title: '未识别到有效手机号', icon: 'none' });
            return;
          }

          
          let baseMap = JSON.parse(JSON.stringify(phoneMap));
          if (Object.keys(baseMap).length === 0) {
            console.log('数据库为空，重置baseMap');
            baseMap = {};
          }

          wx.showModal({
            title: '确认导入',
            content: `有效号码：${uniquePhones.length} 条\n当前数据库已有：${Object.keys(baseMap).length} 个特征值\n是否开始导入？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.batchImportZeroSkip(uniquePhones, baseMap);
              }
            }
          });
        } catch (e) {
          wx.hideLoading();
          console.error('解析失败', e);
          wx.showToast({ title: 'Excel解析失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '文件读取失败', icon: 'none' });
      }
    });
  },

  
  batchImportZeroSkip(uniquePhones, baseMap) {
    let totalSuccess = 0;
    let totalRepeat = 0;
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(uniquePhones.length / BATCH_SIZE);
    let currentBatch = 0;
    let retryCount = 0;
    const MAX_RETRY = 3;
    let failedBatches = [];

    const runBatch = () => {
      if (currentBatch >= totalBatches) {
        this.finishImport(baseMap, totalSuccess, totalRepeat, failedBatches);
        return;
      }

      wx.showLoading({ title: `导入中 ${currentBatch + 1}/${totalBatches}` });
      const start = currentBatch * BATCH_SIZE;
      const end = start + BATCH_SIZE;
      const batchPhones = uniquePhones.slice(start, end);

      const addMap = {};
      let batchSuccess = 0;
      let batchRepeat = 0;

      batchPhones.forEach(phone => {
        const feature = phone.substring(0, 3) + phone.substring(6);
        if (!baseMap[feature]) baseMap[feature] = [];
        if (baseMap[feature].includes(phone)) {
          batchRepeat++;
          return;
        }
        if (!addMap[feature]) addMap[feature] = [];
        addMap[feature].push(phone);
        baseMap[feature].push(phone);
        batchSuccess++;
      });

      
      if (Object.keys(addMap).length === 0) {
        totalRepeat += batchRepeat;
        currentBatch++;
        setTimeout(runBatch, 300);
        return;
      }

      wx.cloud.callFunction({
        name: 'importPhone',
        data: { addMap },
        timeout: 15000,
        success: (res) => {
          if (res.result.success) {
            totalSuccess += batchSuccess;
            totalRepeat += batchRepeat;
            retryCount = 0;
            currentBatch++;
            setTimeout(runBatch, 300);
          } else {
            if (retryCount < MAX_RETRY) {
              retryCount++;
              wx.showToast({ title: `批次${currentBatch+1}重试(${retryCount}/${MAX_RETRY})`, icon: 'none', duration: 500 });
              setTimeout(runBatch, 2000);
            } else {
              failedBatches.push(currentBatch + 1);
              wx.showToast({ title: `批次${currentBatch+1}跳过`, icon: 'none', duration: 500 });
              retryCount = 0;
              currentBatch++;
              setTimeout(runBatch, 300);
            }
          }
        },
        fail: (err) => {
          console.error('网络异常', err);
          if (retryCount < MAX_RETRY) {
            retryCount++;
            wx.showToast({ title: `批次${currentBatch+1}网络重试(${retryCount}/${MAX_RETRY})`, icon: 'none', duration: 500 });
            setTimeout(runBatch, 2000);
          } else {
            failedBatches.push(currentBatch + 1);
            wx.showToast({ title: `批次${currentBatch+1}跳过`, icon: 'none', duration: 500 });
            retryCount = 0;
            currentBatch++;
            setTimeout(runBatch, 300);
          }
        }
      });
    };

    runBatch();
  },
 
  // 导入完成收尾
  finishImport(baseMap, finalSuccess, finalRepeat, failedBatches) {
    wx.hideLoading();
    app.globalData.harassmentPhoneMap = baseMap;
    wx.setStorageSync('harassmentPhoneMap', baseMap);
    this.setData({ phoneMap: baseMap, fileName: '', fileTempPath: '' });

    let content = `✅ 成功导入：${finalSuccess} 条\n🔄 重复号码：${finalRepeat} 条`;
    if (failedBatches.length > 0) {
      content += `\n⚠️ 跳过批次：${failedBatches.join(', ')}（数据已部分导入，可重新导入补全）`;
    }

    wx.showModal({
      title: failedBatches.length === 0 ? '导入完成' : '导入完成（部分跳过）',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 清空所有数据
  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '清空后所有号码将永久删除，无法恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清空中...' });
          wx.cloud.callFunction({
            name: 'clearPhone',
            success: (res) => {
              wx.hideLoading();
              if (res.result.success) {
                const emptyMap = {};
                app.globalData.harassmentPhoneMap = emptyMap;
                wx.setStorageSync('harassmentPhoneMap', emptyMap);
                this.setData({ phoneMap: emptyMap });
                wx.showToast({ title: '已清空所有数据', icon: 'none' });
              } else {
                wx.showToast({ title: '清空失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络异常', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 导出数据
  exportData() {
    const { phoneMap } = this.data;
    if (Object.keys(phoneMap).length === 0) {
      wx.showToast({ title: '暂无数据可导出', icon: 'none' });
      return;
    }

    let exportStr = '骚扰号码特征值列表（前3+后5）：\n';
    for (const [feature, phones] of Object.entries(phoneMap)) {
      exportStr += `${feature}：${phones.join(', ')}\n`;
    }

    wx.setClipboardData({
      data: exportStr,
      success: () => {
        wx.showToast({ title: '数据已复制到剪贴板', icon: 'none' });
      }
    });
  },

  // 退出登录
  logout() {
    this.setData({ isLogin: false, adminPwd: '', phoneList: '' });
    wx.showToast({ title: '已退出登录', icon: 'none' });
  }
});