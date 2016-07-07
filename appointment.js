define([
'jquery',
'underscore',
'backbone',
'views/appointment-map'
], function($, _, Backbone, AppointmentMapView) {
  
  "use strict";

var AppointmentView = Backbone.View.extend({
  initialize: function(opts) {
    console.log("initialize appointment map view");
    var self = this;

    this.loader = null;
    this.userLat = 0;
    this.userLng = 0;
    this.stepsNav = $('.steps-nav');
    this.dwrStores = $('.dwr-stores');
    this.stepsContainer = $('.steps-container');
    this.selectedStore = null;
    this.selectedTimeSlot = null;
    this.selectedStoreID = opts.storeId || false;
    this.currentDate = null;
    this.formActionURL = null;
    this.getLocation();
    this.scrollableStores();
    this.setCurrentDate(new Date());
    this.buildMap();
    this.setCurrentStore();
    //this.buildCalendar();

    // resize google map and stores list
    $(window).on('resize', function(e){ 
      self.scrollableStores();
    })
  },
  getLocation: function() {
    var self = this;
    if (navigator.geolocation) { 
      navigator.geolocation.getCurrentPosition(function(position){
        // success
        self.userLat = position.coords.latitude;
        self.userLng = position.coords.longitude;
        // get distance
        self.distanceStores();

      }, function(error){
        // error
        switch(error.code) {
          case error.PERMISSION_DENIED:
              console.log("User denied the request for Geolocation.");
              break;
          case error.POSITION_UNAVAILABLE:
              console.log("Location information is unavailable.");
              break;
          case error.TIMEOUT:
              console.log("The request to get user location timed out.");
              break;
          case error.UNKNOWN_ERROR:
              console.log("An unknown error occurred.");
              break;
        }
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  },
  distanceStores: function() {
    var self = this;
    this.dwrStores.find('.store-info').each(function(){
      var $this = $(this);
      var miles = self.distance(self.userLat, self.userLng, $this.data('lat'), $this.data('lng'), 'M');
      $this.find('.digit').html(miles.toFixed(1));
    });
  },
  scrollableStores: function() {
    // mobile: 375 the distance beween top modal and google map
    // desktop and tablet: 175 the distance between top modal and steps navigation bottom
    $('.dwr-stores-wrapper').height($('.appointment-form .content').height() - ((Born.mobile)? 375 : 175));
    
    // map
    if(!(Born.mobile)) {
      $('#store-map').height($('.appointment-form .content').height() - 175);
    }
  },
  buildMap: function() {
    this.selectedStore = this.dwrStores.find('.store-info.active');
    this.appointmentMap = new AppointmentMapView({ 
      el: $('#store-map'), 
      lat: this.selectedStore.data('lat'), 
      lng: this.selectedStore.data('lng')
    });
  },
  setCurrentStore: function() {
    var self = this;
    if(this.selectedStoreID) {

      var storeInfo = $('#store-info-' + this.selectedStoreID);

      var event = jQuery.Event('click');
      event.currentTarget = storeInfo.get(0);
      this.changeMap(event);
      
      // scroll to selected store
      $('.dwr-stores-wrapper').animate({ 
        scrollTop: storeInfo.position().top
      }, 2000);
    }
  },
  changeMap: function(e) {
    this.selectedStore = $(e.currentTarget);
    // remove previously active store 
    this.dwrStores.find('.store-info.active').removeClass('active');
    // add active class to selected store
    this.selectedStore.addClass('active');
    // change map location
    this.appointmentMap.changeMarker(this.selectedStore.data('lat'), this.selectedStore.data('lng'));
  },
  setCurrentDate: function(date) {
    this.currentDate = date;
    $('.current-date-today').text($.datepick.formatDate('DD, MM d', date) + this.daySuffix($.datepick.formatDate('d', date)));
  },
  newAppointmentTime: function(e) {
    // need to set selected store again
    this.selectedStore = $(e.currentTarget).parent();
    // remove Calendar ( "destroy" ); 
    $('#appointment-datepicker').datepick('destroy');

    //this.listTimeSlots(); // this function will run after buildCalendar

    // activate second step
    this.stepsNav.find('.step-nav-2').removeClass('disabled').click();
    // build calendar
    this.buildCalendar();
  },
  changeStep: function(e) {
    var $this = $(e.currentTarget);
    var $index = $this.index();

    if(!$this.hasClass('disabled')) {
      // remove active step and block
      this.stepsNav.find('.step-nav.active').removeClass('active');
      this.stepsContainer.find('.step-block.active').removeClass('active');
      // add active class to selected step and block
      $this.addClass('active');
      // show related block
      this.stepsContainer.find('.step-block:eq('+ $index +')').addClass('active');
      // trigger a custome event to indicate that current step has been activated
      $this.trigger('stepactivated', $this);

      //disable steps 
      switch($index) {
        case 0:
          // first step selected again, need to disable second and third steps
          this.stepsNav.find('.step-nav:eq(1)').addClass('disabled');
          this.stepsNav.find('.step-nav:eq(2)').addClass('disabled');
          break;
        case 1:
          // second step selected again, need to disable third step
          this.stepsNav.find('.step-nav:eq(2)').addClass('disabled');
          break;
      }
    }  
  },
  buildCalendar: function() {
    var self = this;
    var onShowCount = 0;
    var datepicker = $('#appointment-datepicker').datepick({
      renderer: $.extend({}, $.datepick.defaultRenderer, {
        /*picker: $.datepick.defaultRenderer.picker.replace(/\{link:today\}/, '{link:current}')*/
        /*day: $.datepick.defaultRenderer.day.replace(/\{day\}/, '{awesome}')*/
        /*
        picker: $.datepick.defaultRenderer.picker
                .replace(/\{link:prev\}/, '{link:prev}{link:prevDay}')
                .replace(/\{link:next\}/, '{link:next}{link:nextDay}')
        */
      }),
      defaultDate: new Date(),
      selectDefaultDate: true,
      changeMonth: false,
      minDate: new Date(),
      prevText: '<i class="fa fa-angle-left"></i>',
      todayText: '',
      nextText: '<i class="fa fa-angle-right"></i>',
      onSelect: function(dates) { 
        self.setCurrentDate(dates[0]);
        self.listTimeSlots(dates[0]);
      }, 
      onDate: function(date, current) { 
        return !current ? {} : {
          content: '<sub>' + $.datepick.formatDate('DD, ', date).substr(0, 2) + '</sub>' + date.getDate(), 
          dateClass: 'showDoY'
        };
      },
      onShow: $.datepick.multipleEvents(function(picker, inst){
        // remove width style 
        picker.css('width', '');
        // add class to td same as child classes
        picker.find('td').each(function(){
          var $this = $(this);
          if($this.children('a').length > 0) {
            $this.addClass('datepick-selectable');
          }
        });
      }, function(picker, inst){
        // second 
        self.buildCalendarMobile(picker);
      })
    });

    // set current date
    datepicker.datepick('setDate', new Date());

    /*
    datepicker.bind("DOMSubtreeModified", function( e ) {
      console.log('something just happened!');
    })
    */
  },
  getCalendarWidth: function(e, step) {
    if($(step).hasClass('step-nav-2')) {
      this.datepickerMobileWidth = $('#appointment-datepicker-mobile').data('marginLeft', '0').width();
    }
  },
  prevNextDay: function(e) {
    var $this = $(e.currentTarget);
    var $picker = $("#appointment-datepicker");
    var date = new Date($picker.datepick('getDate'));
    
    if($this.hasClass('current-date-cmd-yesterday')) {

      date.setDate(date.getDate()-1);

      $picker.datepick('setDate', date);

      return false;

    } else if($this.hasClass('current-date-cmd-tomorrow')){
      
      date.setDate(date.getDate()+1);

      $picker.datepick('setDate', date);

      return false;
    }
  },
  buildCalendarMobile: function(picker) {
    var self = this;
    var datepickMobile = $('<div />'),
        datepickNav = $('<div />'),
        prevMonth = picker.find('.datepick-cmd-prev').clone(),
        nextMonth = picker.find('.datepick-cmd-next').clone(),
        currentDay = $('<span />'),
        datepickMonth = $('<div />'),
        datepickMonthUL = $('<ul />'),
        datepickSlider = $('<div />'),
        datepickSlideLeft = prevMonth.clone().removeClass('datepick-cmd-prev'),
        datepickSlideRight = nextMonth.clone().removeClass('datepick-cmd-next');

    prevMonth.click(function(){
      picker.find('.datepick-cmd-prev').click();
    });

    nextMonth.click(function(){
      picker.find('.datepick-cmd-next').click();
    });

    currentDay.html(picker.find('.datepick-month-header').text()).addClass('datepick-month-header').click(function(){
      picker.find('.datepick-cmd-today').click();
    });

    datepickNav.addClass('datepick-nav-mobile');
    datepickNav.append(prevMonth).append(currentDay).append(nextMonth);

    datepickMobile.addClass('datepick-mobile').append(datepickNav);

    datepickMonthUL.addClass('table');
    
    /*
    if(this.datepickerMobileMarginLeft != undefined) {
      datepickMonthUL.css('marginLeft', this.datepickerMobileMarginLeft);
      console.log('marginLeft: ' + this.datepickerMobileMarginLeft);
    }
    */

    datepickMonthUL.css('marginLeft', $('#appointment-datepicker-mobile').data('marginLeft'));

    picker.find('table tr td').each(function(index, item){
      var $this = $(this);

      if(!$this.children().hasClass('datepick-other-month')) {
        var datepickMonthLI = $('<li />');
        var datepickDayEl = $this.children().clone();

        datepickDayEl.click(function(){
          $this.children().click();
          //self.datepickerMobileMarginLeft = datepickMonthUL.css('marginLeft');
          $('#appointment-datepicker-mobile').data('marginLeft', datepickMonthUL.css('marginLeft'));
        });

        datepickMonthLI.html(datepickDayEl);
        datepickMonthUL.append(datepickMonthLI);
      }
    });

    datepickMonth.addClass('datepick-month').append(datepickMonthUL);

    datepickMobile.append(datepickMonth);

    datepickSlider.addClass('datepick-slider-nav');

    datepickSlideLeft.addClass('datepick-slide-left');

    datepickSlideRight.addClass('datepick-slide-right');

    datepickSlider.append(datepickSlideLeft).append(datepickSlideRight);

    datepickMobile.append(datepickSlider);

    $('#appointment-datepicker-mobile').html(datepickMobile);

    this.datepickerMobileSilder();
  },
  datepickerMobileSilder: function() {
    var self = this;
    var datepickMobile = $('.datepick-mobile'),
        prevMonth = datepickMobile.find('.datepick-cmd-prev'),
        nextMonth = datepickMobile.find('.datepick-cmd-next'),
        datepickMonthUL = datepickMobile.find('.table'),
        datepickMonthLI = datepickMonthUL.find('li'),
        datepickSlideLeft = datepickMobile.find('.datepick-slide-left'),
        datepickSlideRight = datepickMobile.find('.datepick-slide-right');

    var totalLi = datepickMonthLI.length,
        liWidth = datepickMonthLI.outerWidth(),
        liPerSlide = Math.ceil(this.datepickerMobileWidth/liWidth),
        totalWidth = totalLi * liWidth;

    console.log('how many can fit: ' + liPerSlide);
    
    datepickSlideLeft.click(function(e){
      e.preventDefault();

      if (datepickMonthUL.is(':animated')) {
        return false;
      }

      if(parseInt(datepickMonthUL.css('marginLeft')) < 0) {

        datepickMonthUL.animate({marginLeft: '+=' + self.datepickerMobileWidth + 'px'}, 'fast', function(){
          // set current marginLeft
          //self.datepickerMobileMarginLeft = datepickMonthUL.css('marginLeft');
          $('#appointment-datepicker-mobile').data('marginLeft', datepickMonthUL.css('marginLeft'));
        });
      } else {
        // next month with marginLeft = 0
        // after animate is done :)
        datepickMonthUL.animate({foo: 1}, 'fast', function() {
          $('#appointment-datepicker-mobile').data('marginLeft', '0');
          prevMonth.click();
        });
      }
    });

    datepickSlideRight.click(function(e){
      e.preventDefault();

      if (datepickMonthUL.is(':animated')) {
        return false;
      }

      if(Math.abs(parseInt(datepickMonthUL.css('marginLeft'))) < totalWidth - self.datepickerMobileWidth) {

        datepickMonthUL.animate({marginLeft: '-=' + self.datepickerMobileWidth + 'px'}, 'fast', function(){
          // set current marginLeft
          //self.datepickerMobileMarginLeft = datepickMonthUL.css('marginLeft');
          $('#appointment-datepicker-mobile').data('marginLeft', datepickMonthUL.css('marginLeft'));
        });
      } else {
        // next month with marginLeft = 0
        // after animate is done :) promise().done() does not work
        datepickMonthUL.animate({foo: 1}, 'fast', function() {
          $('#appointment-datepicker-mobile').data('marginLeft', '0');
          nextMonth.click();
        });
      }
    });
  },
  listTimeSlots: function(date) {
    var self = this;
    this.timeSlotContainer = $('.available-timeslot');
    this.timeSlotsAM = this.timeSlotContainer.find('.avbl-timeslot-am');
    this.timeSlotsPM = this.timeSlotContainer.find('.avbl-timeslot-pm');
    this.selectedStoreID = this.selectedStore.data('store-id');
    var date = (date)? new Date(date) : new Date(),
        localDate = this.toJSONLocal(date),
        url = Urls.getApptAvailablity + '?date='+ localDate +'&storeId='+ this.selectedStoreID +'&range=daily',
        $message = this.timeSlotContainer.find('.timeslot-message'),
        $error = $('<span />').addClass('error');

    // clear error message
    $message.empty();
    // clear all time slots
    self.timeSlotsAM.empty();
    self.timeSlotsPM.empty();

    this.progress.show($('.make-appointment .steps-container'));

    $.getJSON(url, function (data) {
      self.progress.hide();
      var fail = false;
      if (!data) { 
        $error.html('Not able to load timeslots');
        fail = true;
      } else if(!data[localDate]) {
        $error.html('No timeslots available for today, please choose another day');
        fail = true;
      }
      if (fail) {
        $message.html($error);
        return;
      }
      if(data[localDate].length > 0) {
        $.each(data[localDate], function(index, time) {
          var timeRang = self.timeConvert(time) + ' - ' + self.timeConvert( self.timeAddHours(time, 1) );
          var slot = $('<div />').addClass('timeslot').attr({'data-time24': time, 'data-date-basic': $.datepick.formatDate('yyyy-m-d', date), 'data-time': timeRang, 'data-date': $.datepick.formatDate('DD, MM d, yyyy', date) });
          slot.html(timeRang);

          if(timeRang.indexOf('AM') !== -1) {
            self.timeSlotsAM.append(slot);
          } else {
            self.timeSlotsPM.append(slot);
          }
        });
      }
    });
  },
  selectTimeSlot: function(e) {
    this.selectedTimeSlot = $(e.currentTarget);

    // remove any selected class from timeslots
    this.timeSlotContainer.find('.timeslot.selected').removeClass('selected');
    // add selected class to current time slot 
    this.selectedTimeSlot.addClass('selected');

    // set date and time labels
    var chosenDateTime = $('.chosen-date-and-time');
    chosenDateTime.find('.date-shown').html(this.selectedTimeSlot.data('date'));
    chosenDateTime.find('.time-shown').html(this.selectedTimeSlot.data('time') + ' ' + this.selectedStore.data('store-timezone'));

    this.stepsNav.find('.step-nav-3').removeClass('disabled').click();

    this.loadForm();
  },
  loadForm: function() {
    var self = this;
    var formWrapper = $('.schedule-form-wrapper');
    var form = formWrapper.find('form');

    this.formActionURL = form.attr('action');

    $.get(this.formActionURL, function(result){
      formWrapper.html(result);

      formWrapper.find('#setster_store_id').val(self.selectedStoreID);
      formWrapper.find('#setster_date').val(self.selectedTimeSlot.data('date-basic'));
      formWrapper.find('#setster_time').val(self.selectedTimeSlot.data('time24'));
    });
  },
  scheduleAppointment: function(e) {
    e.preventDefault();
    var self = this;
    var $this = $(e.currentTarget);

    var formURL, formData, serializedData, submitButton;

    formURL = $this.attr('action');
    formData = $this.serializeArray();
    submitButton = $this.find('button');
    formData.push({ name: submitButton.attr('name'), value: submitButton.val() });
    serializedData = $.param( formData );

    $.post(formURL, serializedData, function(response){
      var formWrapper = $('.schedule-form-wrapper');
      formWrapper.html(response);

      console.log(formWrapper.find('.success-message'));

      if(formWrapper.find('.success-message').length > 0) {
        // disable all steps nav
        self.stepsNav.find('.step-nav').addClass('disabled').removeClass('active');
        // add click event to button to close modal
        formWrapper.find('.button-close').click(function(){
          $('.close').click();
        });
      }
    });

    return false;
  },
  distance: function(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit=="K") { dist = dist * 1.609344; }
    if (unit=="N") { dist = dist * 0.8684; }
    return dist;
  },
  toJSONLocal: function(date) {
    var local = new Date(date);
    local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  },
  timeConvert: function(timeString) {
    var hourEnd = timeString.indexOf(":");
    var H = +timeString.substr(0, hourEnd);
    var h = H % 12 || 12;
    var ampm = H < 12 ? "AM" : "PM";
    timeString = h + timeString.substr(hourEnd, 3) + ' ' + ampm;
    return timeString;
  },
  timeAddHours: function(timeString, hours) {
    var time = timeString.split(':');
    timeString = (parseInt(time[0])+hours) + ':' + time[1] + ':' + time[2];
    return timeString;
  },
  daySuffix: function(i) {
      var j = i % 10,
          k = i % 100;
      if (j == 1 && k != 11) {
          return "st";
      }
      if (j == 2 && k != 12) {
          return "nd";
      }
      if (j == 3 && k != 13) {
          return "rd";
      }
      return "th";
  },
  progress: {
    show: function(container){
      var target = (!container || $(container).length === 0) ? $('body') : $(container);
      this.loader = this.loader || $('.loader');

      if (this.loader.length === 0) {
        this.loader = $('<div/>').addClass('loader').append($('<div/>').addClass('loader-indicator'), $('<div/>').addClass('loader-bg'));
      }
      return this.loader.appendTo(target).show();
    },
    hide: function(){
      if (this.loader) {
        this.loader.hide();
      }
    }
  },
  events: {
    'click .store-info': 'changeMap',
    'click .store-info .store-select': 'newAppointmentTime',
    'click .step-nav': 'changeStep',
    'click .current-date-cmd': 'prevNextDay',
    'click .available-timeslot .timeslot': 'selectTimeSlot',
    'stepactivated': 'getCalendarWidth',
    'submit .fill-information form': 'scheduleAppointment'
  }

});

return AppointmentView;

});