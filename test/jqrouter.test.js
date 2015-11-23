/**
 * Created by lalittanwar on 28/09/15.
 */
define({
  name: "jqrouter.test",
  extend: "spamjs.view",
  using : ["jqrouter"]
}).as(function (test,jqrouter) {
  return {
    _init_: function () {
      console.error("jqrouter.test.init")
      jqrouter.setQueryParams({
        x : "X",
        y : ["Y1","Y2"]
      })
      this.$$.loadTemplate(this.path("jqrouter.test.html"));

    },
    _remove_: function () {

    }
  };
});