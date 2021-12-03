<template>
  <div>
    {{ msg }}
  </div>
</template>

<script>
import { ref } from "vue";
export default {
  setup() {
    const msg = ref("hell yvite2");
    return {
      msg
    };
  }
};
</script>

<style lang="scss" scoped></style>
