import { basekit, Component } from '@lark-opdev/block-basekit-server-api';

// 多语言支持
const t = (key: string) => {
  const translations: { [key: string]: string } = {
    'accountLabel': '所属账号名称',
    'frameworkLabel': '主打框架',
    'customFrameworkLabel': '自定义框架选项',
    'frameworkModeLabel': '框架配置模式',
    'dateLabel': '预定发布日期',
    'scriptLabel': '脚本名称',
    'editorLabel': '剪辑负责人姓名',
    'accountPlaceholder': '例如：男主播A',
    'scriptPlaceholder': '例如：Polo衫面料深度解析',
    'editorPlaceholder': '例如：张三',
    'customFrameworkPlaceholder': '请输入自定义框架选项，用逗号分隔，例如：性价比,实用性,美观度',
    'trust': '信任',
    'price': '价格',
    'quality': '品质',
    'emotion': '情感',
    'professional': '专业',
    'creative': '创意',
    'usePreset': '使用预设选项',
    'useCustom': '使用自定义选项'
  };
  return translations[key] || key;
};

// 默认框架选项
const DEFAULT_FRAMEWORK_OPTIONS = [
  { label: t('trust'), value: '信任' },
  { label: t('price'), value: '价格' },
  { label: t('quality'), value: '品质' },
  { label: t('emotion'), value: '情感' },
  { label: t('professional'), value: '专业' },
  { label: t('creative'), value: '创意' },
];

// 解析自定义框架选项
function parseCustomFrameworks(customFrameworksText: string): { label: string; value: string }[] {
  if (!customFrameworksText || !customFrameworksText.trim()) {
    return [];
  }
  
  return customFrameworksText
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => ({ label: item, value: item }));
}

// 生成视频名称的核心函数
function generateVideoName(
  accountName: string,
  frameworks: string[],
  plannedPublishDate: string,
  scriptName: string,
  editorName?: string
): string {
  // 1. 账号名称
  const partAccount = accountName.trim();
  
  // 2. 框架
  let partFramework = '';
  if (frameworks.length > 0) {
    partFramework = frameworks.join(',');
  }
  
  // 3. 日期格式化为 YYYYMMDD
  let partDate = '';
  if (plannedPublishDate) {
    // 处理时间戳格式的日期
    const date = new Date(plannedPublishDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    partDate = `${year}${month}${day}`;
  }
  
  // 4. 脚本名称
  const partScript = scriptName.trim();
  
  // 5. 剪辑人
  let partEditor = '';
  if (editorName && editorName.trim()) {
    partEditor = editorName.trim();
  }
  
  // 拼接所有部分
  const parts = [partAccount];
  if (partFramework) parts.push(partFramework);
  if (partDate) parts.push(partDate);
  parts.push(partScript);
  if (partEditor) parts.push(partEditor);
  
  return parts.join('-');
}

// 验证输入数据
function validateInputs(
  accountName: string,
  plannedPublishDate: string,
  scriptName: string
): { isValid: boolean; errorMessage?: string } {
  if (!accountName || accountName.trim().length < 2) {
    return { isValid: false, errorMessage: '账号名称至少需要2个字符' };
  }
  
  if (!plannedPublishDate) {
    return { isValid: false, errorMessage: '请选择发布日期' };
  }
  
  // 验证日期不能早于今天
  const selectedDate = new Date(plannedPublishDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return { isValid: false, errorMessage: '发布日期不能早于今天' };
  }
  
  if (!scriptName || scriptName.trim().length < 3) {
    return { isValid: false, errorMessage: '脚本名称至少需要3个字符' };
  }
  
  return { isValid: true };
}

// 添加字段捷径
basekit.addAction({
  // 表单配置
  formItems: [
    {
      itemId: 'accountName',
      label: t('accountLabel'),
      component: Component.Input,
      componentProps: {
        placeholder: t('accountPlaceholder'),
      },
      required: true,
    },
    {
      itemId: 'frameworkMode',
      label: t('frameworkModeLabel'),
      component: Component.Radio,
      componentProps: {
        options: [
          { label: t('usePreset'), value: 'preset' },
          { label: t('useCustom'), value: 'custom' },
        ],
      },
      required: true,
    },
    {
        itemId: 'frameworks',
        label: t('frameworkLabel'),
        component: Component.MultipleSelect,
        componentProps: {
          options: DEFAULT_FRAMEWORK_OPTIONS,
        },
      },
      {
        itemId: 'customFrameworks',
        label: t('customFrameworkLabel'),
        component: Component.Input,
        componentProps: {
          placeholder: t('customFrameworkPlaceholder'),
        },
      },
    {
        itemId: 'plannedPublishDate',
        label: t('dateLabel'),
        component: Component.DateTimePicker,
        required: true,
      },
    {
      itemId: 'scriptName',
      label: t('scriptLabel'),
      component: Component.Input,
      componentProps: {
        placeholder: t('scriptPlaceholder'),
      },
      required: true,
    },
    {
      itemId: 'editorName',
      label: t('editorLabel'),
      component: Component.Input,
      componentProps: {
        placeholder: t('editorPlaceholder'),
      },
    },
  ],
  
  // 返回结果类型
  resultType: {
    type: 'object',
    properties: {
      result: {
        type: 'string',
        label: '生成的视频名称'
      }
    }
  },
  
  // 执行函数
  execute: async (formItemParams: any, context: any) => {
    try {
      const {
        accountName,
        frameworkMode,
        frameworks,
        customFrameworks,
        plannedPublishDate,
        scriptName,
        editorName,
      } = formItemParams;
      
      // 处理框架数据
      let frameworkValues: string[] = [];
      
      if (frameworkMode && frameworkMode.value === 'custom') {
        // 使用自定义框架
        const customOptions = parseCustomFrameworks(customFrameworks || '');
        frameworkValues = customOptions.map(option => option.value);
      } else {
        // 使用预设框架
        frameworkValues = frameworks ? frameworks.map((fw: any) => fw.value || fw) : [];
      }
      
      // 处理日期数据（从字段选择器获取的是时间戳）
      const dateValue = Array.isArray(plannedPublishDate) && plannedPublishDate.length > 0 
        ? plannedPublishDate[0] 
        : plannedPublishDate;
      
      // 验证输入
      const validation = validateInputs(
        accountName || '',
        dateValue || '',
        scriptName || ''
      );
      
      if (!validation.isValid) {
        return {
          result: `错误: ${validation.errorMessage}`
        };
      }
      
      // 额外验证：如果选择自定义模式但没有输入自定义框架，给出提示
      if (frameworkMode && frameworkMode.value === 'custom' && frameworkValues.length === 0) {
        return {
          result: '错误: 选择自定义模式时，请输入至少一个自定义框架选项'
        };
      }
      
      // 生成视频名称
      const videoName = generateVideoName(
        accountName,
        frameworkValues,
        dateValue,
        scriptName,
        editorName
      );
      
      return {
        result: videoName
      };
    } catch (error) {
      console.error('生成视频名称时发生错误:', error);
      return {
        result: `错误: 生成视频名称时发生错误，请检查输入数据`
      };
    }
  },
});

export default basekit;