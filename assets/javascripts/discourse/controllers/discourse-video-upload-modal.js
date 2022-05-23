import Controller from "@ember/controller";
import ModalFunctionality from "discourse/mixins/modal-functionality";

export default Controller.extend(ModalFunctionality, {
  afterUploadComplete: null,

  onClose() {
    this.set("afterUploadComplete", null);
  },
});
