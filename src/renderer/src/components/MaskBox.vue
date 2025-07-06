<template>
    <div class="maskBoxShell">
        <div style="top: 0%; left: 0%; border-style: solid none none solid;"></div>
        <div style="top: 0%; right: 0%; border-style: solid solid none none;"></div>
        <div style="bottom: 0%; left: 0%; border-style: none none solid solid;"></div>
        <div style="bottom: 0%; right: 0%; border-style: none solid solid none;"></div>
    </div>
</template>

<style lang="css" scoped>
.maskBoxShell {
    position: absolute;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: none;
}

.maskBoxShell>div {
    position: absolute;
    width: 85px;
    height: 85px;
    border-width: 8px;
    border-color: aqua;
    box-sizing: border-box;
    border-radius: 4px;
}
</style>