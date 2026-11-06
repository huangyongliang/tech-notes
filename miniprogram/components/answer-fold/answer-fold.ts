Component({
  properties: {
    blocks: { type: Array, value: [] },
    baseId: { type: String, value: "" },
  },
  data: {
    open: false,
  },
  methods: {
    toggle() {
      this.setData({ open: !this.data.open });
    },
  },
});
