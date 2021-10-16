function prepareBundledDescriptor(content) {
    const jsonData = JSON.parse(content.toString());

    const publishConfig = jsonData.publishConfig || {};
    const patchedJsonData = { ...jsonData, main: publishConfig.main, types: publishConfig.types };

    return Buffer.from(JSON.stringify(patchedJsonData, null, 4));
}

module.exports = { prepareBundledDescriptor };