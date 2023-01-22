/**
 * This file was lifted as is from ais.usvisa-info.com. This is the JS code which already runs on their page.
 * We're merely re-injecting it so puppeteer can access these methods, with slight modifications.
 */
(function() {
  var AppointmentSchedulingManager;

  var delayPromise = (time) => (result) => new Promise(resolve => setTimeout(() => resolve(result), time));

  AppointmentSchedulingManager = (function() {
    function AppointmentSchedulingManager() {
      var asc_appointment_date_field, asc_appointment_time_field, asc_facility_field, consulate_appointment_date_field,
        consulate_appointment_time_field, consulate_facility_field, minDate;
      this.consulateBusinessDays = [];
      this.availableConsulateDays = [];
      this.consulateBusinessTimes = [];
      this.available_times = [];
      this.ascBusinessDays = [];
      this.availableAscDays = [];
      this.ascBusinessTimes = [];
      consulate_facility_field = $("#appointments_consulate_appointment_facility_id");
      consulate_appointment_date_field = $("#appointments_consulate_appointment_date");
      consulate_appointment_time_field = $("#appointments_consulate_appointment_time");
      asc_facility_field = $("#appointments_asc_appointment_facility_id");
      asc_appointment_date_field = $("#appointments_asc_appointment_date");
      asc_appointment_time_field = $("#appointments_asc_appointment_time");
    }

    AppointmentSchedulingManager.prototype.consulateLocationChanged = function() {
      var ascConsulateSelected, facility_id, selectedConsulate;
      facility_id = $("#appointments_consulate_appointment_facility_id").val();
      this.loadAddress(facility_id, $("#appointments_consulate_address"));
      this.loadConsulateDays();
      this.loadAscs();
      this.loadAscDays();
      this.showAvailabilityTable();
      this.enableSubmitButton();
      selectedConsulate = $("#appointments_consulate_appointment_facility_id option:selected");
      ascConsulateSelected = $("#asc_left").find("#appointments_consulate_appointment_facility_id_input").length > 0;
      if (selectedConsulate.data("collects-biometrics") && !ascConsulateSelected) {
        return $("#asc-appointment-fields").parents("fieldset").hide();
      } else {
        return $("#asc-appointment-fields").parents("fieldset").unhide();
      }
    };

    AppointmentSchedulingManager.prototype.consulateDateChanged = async function(date) {
      this.enableSubmitButton();
      const times = await this.loadConsulateTimes();
      this.loadAscDays();
      this.showAvailabilityTable();
      if (this.consulateBusinessDays.indexOf(date) !== -1) {
        $("#non-consulate-business-day-message").fadeOut(250);
      } else {
        $("#non-consulate-business-day-message").fadeIn(250);
      }
      return times;
    };

    AppointmentSchedulingManager.prototype.consulateTimeChanged = function() {
      var time;
      time = $("#appointments_consulate_appointment_time").val();
      this.loadAscDays();
      this.loadAscTimes();
      this.enableSubmitButton();
      if (time === "") {
        this.disableAscFields();
      } else {
        this.enableAscFields();
      }
      if (!this.useConsulateCapacity) {
        this.checkIvAscDays();
      }
      if (this.consulateBusinessTimes.indexOf(time) !== -1 || time === "" || $("#non-consulate-business-day-message").is(":visible")) {
        return $("#non-consulate-business-time-message").fadeOut(250);
      } else {
        return $("#non-consulate-business-time-message").fadeIn(250);
      }
    };

    AppointmentSchedulingManager.prototype.ascLocationChanged = function() {
      var facility_id;
      facility_id = $("#appointments_asc_appointment_facility_id").val();
      this.loadAddress(facility_id, $("#appointments_asc_address"));
      this.loadAscDays();
      this.showAvailabilityTable();
      return this.enableSubmitButton();
    };

    AppointmentSchedulingManager.prototype.ascDateChanged = function(date) {
      this.loadAscTimes();
      this.showAvailabilityTable();
      this.enableSubmitButton();
      if (this.ascBusinessDays.indexOf(date) !== -1) {
        return $("#non-asc-business-day-message").fadeOut(250);
      } else {
        return $("#non-asc-business-day-message").fadeIn(250);
      }
    };

    AppointmentSchedulingManager.prototype.ascTimeChanged = function() {
      var time;
      this.enableSubmitButton();
      time = $("#appointments_asc_appointment_time").val();
      if (this.ascBusinessTimes.indexOf(time) !== -1 || time === "" || $("#non-asc-business-day-message").is(":visible")) {
        return $("#non-asc-business-time-message").fadeOut(250);
      } else {
        return $("#non-asc-business-time-message").findIn(250);
      }
    };

    AppointmentSchedulingManager.prototype.baseAjaxPath = function() {
      var path;
      path = window.location.pathname;
      path = path.slice(0, path.indexOf("appointment"));
      path = path + "appointment";
      return path;
    };

    AppointmentSchedulingManager.prototype.loadConsulateDays = async function() {
      try {
        var facility_id, path;
        if (!$("#appointments_consulate_appointment_date").length) {
          return;
        }
        this.consulateBusinessDays = [];
        this.availableConsulateDays = [];
        if ($("#appointments_consulate_appointment_date").attr("type") !== "hidden") {
          $("#appointments_consulate_appointment_date").val("");
        }
        if ($("#appointments_consulate_appointment_time").attr("type") !== "hidden") {
          $("#appointments_consulate_appointment_time").val("");
        }
        facility_id = $("#appointments_consulate_appointment_facility_id").val();
        path = this.baseAjaxPath() + "/days/" + facility_id + ".json?appointments[expedite]=" + $("#appointments_expedite").is(":checked");
        if (facility_id) {
          const data = await fetch(path);
          const result = await data.json();
          if (typeof result.error === "undefined") {
            this.consulateBusinessDays = result.filter(function(day) {
              return day.business_day;
            }).map(function(day) {
              return day.date;
            });
            this.availableConsulateDays = result.map(function(day) {
              return day.date;
            });
          }
          if (this.availableConsulateDays.length > 0) {
            $("#consulate_date_time").unhide();
            $("#consulate_date_time_not_available").hide();
          } else {
            $("#consulate_date_time").hide();
            $("#consulate_date_time_not_available").unhide();
          }
          return result;
        }
        return { data: "noFacilityId" };
      } catch (error) {
        logTG("[ERROR] API: " + error.message);
        restartPolling();
        return { errorMessage: error };
      }
    };

    AppointmentSchedulingManager.prototype.loadConsulateTimes = async function() {
      try {
        var date, facility_id, path;
        if (!$("#appointments_consulate_appointment_time").length) {
          return;
        }
        this.consulateBusinessTimes = [];
        facility_id = $("#appointments_consulate_appointment_facility_id").val();
        date = $("#appointments_consulate_appointment_date").val();
        path = this.baseAjaxPath() + "/times/" + facility_id + ".json?date=" + date + "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
        if (facility_id) {
          const data = await fetch(path);
          const response = await data.json();
          this.consulateBusinessTimes = response.business_times;
          this.available_times = response.available_times;
          this.setSelectOptions("#appointments_consulate_appointment_time", response.available_times);
          this.consulateTimeChanged();
          return response.available_times;
        }
        return { data: "noFacilityId" };
      } catch (error) {
        return { errorMessage: error };
      }
    };

    AppointmentSchedulingManager.prototype.loadAscs = function() {
      var asc_select, consulate_id, path;
      asc_select = $("#appointments_asc_appointment_facility_id");
      consulate_id = $("#appointments_consulate_appointment_facility_id").val();
      path = this.baseAjaxPath() + "/available_ascs/" + consulate_id + ".json";
      if (consulate_id && $("#appointments_consulate_appointment_date").length === 0) {
        $.getJSON(path, "", (function(_this) {
          return function(response) {
            var id, name, selected_asc;
            selected_asc = asc_select.val();
            asc_select.find("option").remove();
            for (id in response) {
              name = response[id];
              asc_select.append($("<option>").val(id).text(name));
            }
            return asc_select.val(selected_asc).trigger("change");
          };
        })(this));
      }
      return true;
    };

    AppointmentSchedulingManager.prototype.loadAscDays = function() {
      var consulate_date, consulate_id, consulate_time, facility_id, path;
      if (!$("#appointments_asc_appointment_date").length) {
        return;
      }
      this.ascBusinessDays = [];
      this.availableAscDays = [];
      $("#appointments_asc_appointment_date").val("");
      $("#appointments_asc_appointment_time").val("");
      facility_id = $("#appointments_asc_appointment_facility_id").val();
      consulate_id = $("#appointments_consulate_appointment_facility_id").val() || "";
      consulate_date = $("#appointments_consulate_appointment_date").val() || "";
      consulate_time = $("#appointments_consulate_appointment_time").val() || "";
      path = this.baseAjaxPath() + "/days/" + facility_id + ".json?&consulate_id=" + consulate_id + "&consulate_date=" + consulate_date + "&consulate_time=" + consulate_time + "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
      if (facility_id) {
        $.getJSON(path, "", (function(_this) {
          return function(result) {
            _this.ascBusinessDays = result.filter(function(day) {
              return day.business_day;
            }).map(function(day) {
              return day.date;
            });
            _this.availableAscDays = result.map(function(day) {
              return day.date;
            });
            if ($("#appointments_asc_appointment_facility_id").is(":disabled")) {
              $("#asc_date_time").hide();
              return $("#asc_date_time_not_available").hide();
            } else if (_this.availableAscDays.length > 0) {
              $("#asc_date_time").unhide();
              return $("#asc_date_time_not_available").hide();
            } else {
              $("#asc_date_time").hide();
              return $("#asc_date_time_not_available").unhide();
            }
          };
        })(this));
      }
      return true;
    };

    AppointmentSchedulingManager.prototype.loadAscTimes = function() {
      var consulate_date, consulate_id, consulate_time, date, facility_id, path;
      if (!$("#appointments_asc_appointment_time").length) {
        return;
      }
      this.ascBusinessTimes = [];
      facility_id = $("#appointments_asc_appointment_facility_id").val();
      consulate_id = $("#appointments_consulate_appointment_facility_id").val() || "";
      date = $("#appointments_asc_appointment_date").val();
      consulate_date = $("#appointments_consulate_appointment_date").val() || "";
      consulate_time = $("#appointments_consulate_appointment_time").val() || "";
      path = this.baseAjaxPath() + "/times/" + facility_id + ".json?date=" + date + "&consulate_id=" + consulate_id + "&consulate_date=" + consulate_date + "&consulate_time=" + consulate_time + "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
      if (facility_id) {
        $.getJSON(path, "", (function(_this) {
          return function(response) {
            _this.ascBusinessTimes = response.business_times;
            _this.setSelectOptions("#appointments_asc_appointment_time", response.available_times);
            return _this.ascTimeChanged();
          };
        })(this));
      }
      return true;
    };

    AppointmentSchedulingManager.prototype.loadAddress = function(facility_id, address_container) {
      var path;
      address_container.unhide();
      path = this.baseAjaxPath() + "/address/" + facility_id;
      if (facility_id) {
        $.get(path, "", (function(_this) {
          return function(result) {
            return address_container.fadeOut(250, function() {
              address_container.html($("<strong>").append(address_container.data("header")));
              return address_container.addClass("card").append("<br>").append(result).fadeIn(250);
            });
          };
        })(this));
      } else {
        address_container.html("");
      }
      return true;
    };

    AppointmentSchedulingManager.prototype.consulateDateAvailable = function(date) {
      var dateString;
      dateString = $.datepicker.formatDate("yy-mm-dd", date);
      return [$.inArray(dateString, this.availableConsulateDays) !== -1];
    };

    AppointmentSchedulingManager.prototype.ascDateAvailable = function(date) {
      var dateString;
      dateString = $.datepicker.formatDate("yy-mm-dd", date);
      return [$.inArray(dateString, this.availableAscDays) !== -1];
    };

    AppointmentSchedulingManager.prototype.setSelectOptions = function(selector, values) {
      $(selector).html("<option></option>");
      return $(values).each((function(_this) {
        return function(index, value) {
          return $("<option>").val(value).html(value).appendTo(selector);
        };
      })(this));
    };

    AppointmentSchedulingManager.prototype.checkIvAscDays = function() {
      var consulate_date, consulate_id, consulate_time, firstAscId, path;
      firstAscId = $("#appointments_asc_appointment_facility_id").find("option[value != \"\"]").val();
      if (firstAscId) {
        consulate_id = $("#appointments_consulate_appointment_facility_id").val() || "";
        consulate_date = $("#appointments_consulate_appointment_date").val() || "";
        consulate_time = $("#appointments_consulate_appointment_time").val() || "";
        path = this.baseAjaxPath() + "/days/" + firstAscId + ".json?&consulate_id=" + consulate_id + "&consulate_date=" + consulate_date + "&consulate_time=" + consulate_time + "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
        if (consulate_time !== "") {
          return $.getJSON(path, "", (function(_this) {
            return function(result) {
              var day, days;
              days = result.map(function(day) {
                return day.date;
              });
              day = days[days.length - 1];
              if (day && new Date(day) > new Date()) {
                $("#asc-appointment-fields").unhide();
              } else {
                $("#asc-appointment-fields").hide();
              }
              return _this.enableSubmitButton();
            };
          })(this));
        }
      }
    };

    AppointmentSchedulingManager.prototype.showAvailabilityTable = function() {
      var asc_container, asc_date, asc_id, consulate_container, consulate_date, consulate_id, consulate_time, path;
      if ($("#appointments_expedite").is(":checked")) {
        $("#appointments_consulate_address").hide();
        $("#appointments_asc_address").hide();
        $("#appointments_consulate_availability").unhide();
        $("#consulate_right").removeClass("medium-6").addClass("medium-8");
        $("#consulate_left").removeClass("medium-6").addClass("medium-4");
        $("#asc_right").removeClass("medium-6").addClass("medium-8");
        $("#asc_left").removeClass("medium-6").addClass("medium-4");
        $("#appointments_asc_availability").unhide();
        $("#appointments_consulate_notes").unhide();
        $("#appointments_asc_notes").unhide();
        consulate_id = $("#appointments_consulate_appointment_facility_id").val() || "";
        consulate_date = $("#appointments_consulate_appointment_date").val();
        consulate_time = $("#appointments_consulate_appointment_time").val();
        consulate_container = $("#appointments_consulate_availability");
        if (consulate_id !== "" && consulate_date !== "") {
          $("#appointments_consulate_availability table.availability-table").addClass("disabled");
          $("#appointments_consulate_address").hide();
          this.showNotes(consulate_id, consulate_date);
          path = this.baseAjaxPath() + "/availability_table/" + consulate_id + "?date=" + consulate_date;
          path += "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
          $.get(path, "", (function(_this) {
            return function(result) {
              return consulate_container.fadeOut(250, function() {
                return consulate_container.html(result).fadeIn(250, function() {
                  _this.listenToAvailabilityTableEvents();
                  return $("#appointments_consulate_availability table.availability-table").find("input").icheck();
                });
              });
            };
          })(this));
        }
        asc_id = $("#appointments_asc_appointment_facility_id").val() || "";
        asc_date = $("#appointments_asc_appointment_date").val();
        asc_container = $("#appointments_asc_availability");
        if (asc_id !== "" && asc_date !== "") {
          $("#appointments_asc_availability table.availability-table").addClass("disabled");
          $("#appointments_asc_address").hide();
          this.showNotes(asc_id, asc_date);
          path = this.baseAjaxPath() + "/availability_table/" + asc_id + "?date=" + asc_date;
          path += "&appointments[expedite]=" + $("#appointments_expedite").is(":checked");
          path += "&consulate_id=" + consulate_id;
          path += "&consulate_date=" + consulate_date;
          path += "&consulate_time=" + consulate_time;
          $.get(path, "", (function(_this) {
            return function(result) {
              return asc_container.fadeOut(250, function() {
                return asc_container.html(result).fadeIn(250, function() {
                  _this.listenToAvailabilityTableEvents();
                  return $("#appointments_asc_availability table.availability-table").find("input").icheck();
                });
              });
            };
          })(this));
        }
      } else {
        $("#appointments_consulate_address").unhide();
        $("#appointments_asc_address").unhide();
        $("#appointments_consulate_availability").hide();
        $("#consulate_right").removeClass("medium-8").addClass("medium-6");
        $("#consulate_left").removeClass("medium-4").addClass("medium-6");
        $("#asc_right").removeClass("medium-8").addClass("medium-6");
        $("#asc_left").removeClass("medium-4").addClass("medium-6");
        $("#appointments_asc_availability").hide();
        $("#appointments_consulate_notes").hide();
        $("#appointments_asc_notes").hide();
      }
      return true;
    };

    AppointmentSchedulingManager.prototype.listenToAvailabilityTableEvents = function() {
      return $("table.availability-table tr:not(.disabled) td").on("click", (function(_this) {
        return function(e) {
          var asc_date_field, consulate_date_field, date, parent;
          date = $(e.target).closest("tr").data("date");
          parent = $(e.target).closest(".appointment-fields");
          consulate_date_field = parent.find("#appointments_consulate_appointment_date");
          asc_date_field = parent.find("#appointments_asc_appointment_date");
          if (consulate_date_field.length > 0) {
            consulate_date_field.val(date);
            _this.consulateDateChanged(date);
          }
          if (asc_date_field.length > 0) {
            asc_date_field.val(date);
            return _this.ascDateChanged(date);
          }
        };
      })(this));
    };

    AppointmentSchedulingManager.prototype.showNotes = function(facility_id, date) {
      var path;
      path = this.baseAjaxPath() + "/notes/" + facility_id + ".json?date=" + date;
      $.getJSON(path, "", (function(_this) {
        return function(response) {
          var container;
          if (typeof response.error === "undefined") {
            container = $("#appointments_" + response.facility_type + "_notes");
            return container.fadeOut(250, function() {
              return container.html($("<div>").append($("<label>").html(response.header))).append(response.notes).fadeIn(250);
            });
          }
        };
      })(this));
      return true;
    };

    AppointmentSchedulingManager.prototype.disableAscFields = function() {
      $("#appointments_asc_appointment_date").attr("disabled", true);
      $("#appointments_asc_appointment_time").attr("disabled", true);
      return $("#appointments_asc_appointment_facility_id").attr("disabled", true);
    };

    AppointmentSchedulingManager.prototype.enableAscFields = function() {
      $("#appointments_asc_appointment_date").removeAttr("disabled");
      $("#appointments_asc_appointment_time").removeAttr("disabled");
      return $("#appointments_asc_appointment_facility_id").removeAttr("disabled");
    };

    AppointmentSchedulingManager.prototype.enableSubmitButton = function() {
      var collectBiometricsAtConsulate, disabled, requiredAscFields, requiredConsulateFields;
      disabled = false;
      requiredAscFields = $("#asc-appointment-fields").find(".input .required");
      requiredConsulateFields = $("#consulate-appointment-fields").find(".input .required");
      collectBiometricsAtConsulate = $("#collect_biometrics_at_consulate").is(":checked");
      if (requiredAscFields.length === 0 && requiredConsulateFields.length === 0) {
        disabled = true;
      }
      if ($("#asc-appointment-fields").is(":visible") && !collectBiometricsAtConsulate) {
        requiredAscFields.each((function(_this) {
          return function(index, element) {
            if (!$(element).val()) {
              return disabled = true;
            }
          };
        })(this));
      }
      if ($("#consulate-appointment-fields").is(":visible")) {
        requiredConsulateFields.each((function(_this) {
          return function(index, element) {
            if (!$(element).val()) {
              return disabled = true;
            }
          };
        })(this));
      }
      return $("#appointments_submit").attr("disabled", disabled);
    };

    AppointmentSchedulingManager.prototype.startPolling = async function() {
      const dates = await this.loadConsulateDays();
      const interval = await getPollInterval();
      const targetDateStr = await getTargetDate();
      const targetDate = moment(targetDateStr);
      logTG("Poll interval: " + interval + "ms\nTarget date: " + targetDate.format("YYYY-MM-DD"));
      if (Array.isArray(dates) && dates.length > 0) {
        logTG("Available dates: \n" + dates.map(d => d.date).join("\n"));
        const firstAvailable = moment(dates[0].date);
        if (firstAvailable.isSameOrBefore(targetDate)) {
          $('#appointments_consulate_appointment_date').val(dates[0].date);
          const times = await this.consulateDateChanged(dates[0].date);
          logTG("Available times: " + times.join("\n"));
          if (Array.isArray(times) && times.length > 0) {
            const selectedTime = times[times.length - 1];
            $('#appointments_consulate_appointment_time').val(selectedTime);
            this.consulateTimeChanged();
            await delayPromise(1000);
            logTG(`FOUND A DATE!! Selected ${firstAvailable.format("YYYY-MM-DD")} @ ${selectedTime}. Submitting now`);
            $('#appointments_submit').trigger("click");
            await delayPromise(3000);
            $('.reveal-overlay a').get(1).click();
            return true
          }
        }
      }
      logTG("Whoops! No slots. Recheck after " + interval + "ms...");
      setTimeout(this.startPolling.bind(this), interval);
      return false;
    };

    return AppointmentSchedulingManager;
  })();

  $(function() {
    window._asm = new AppointmentSchedulingManager();
  });
})();
