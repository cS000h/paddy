// 文件交给浏览器下载和选择，不依赖服务器或远程地址。
export const files = {
  download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  choose() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.hidden = true;
      document.body.append(input);
      input.oncancel = () => {
        input.remove();
        resolve(null);
      };
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (file?.size > 5 * 1024 * 1024)
            throw new Error('文件太大，请选《稻》的进度 JSON 文件。');
          resolve(file ? await file.text() : null);
        } catch (error) {
          reject(error);
        } finally {
          input.remove();
        }
      };
      input.click();
    });
  },
};
