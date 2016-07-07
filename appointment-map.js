define([
  'jquery',
  'underscore',
  'backbone'
  ], function ($, _, Backbone) {

  "use strict"; 

  var AppointmentMapView = Backbone.View.extend({
    initialize: function(opts) {
      console.log('new appointment map');
      opts = opts || {};
      this.lat = opts.lat;
      this.lng = opts.lng;
      this.markers = [];
      this.render();
    },
    render: function() {
      var self = this;

      var styles = [{
        featureType: "all",
        elementType: "all",
        stylers: [
          { saturation: -100 }
        ]
      }];

      this.map = new google.maps.Map(this.$el.get(0), {
        center: { lat: self.lat, lng: self.lng },
        zoom: 15,
        scrollwheel: false,
        panControl: false,
        zoomControl: false,
        streetViewControl: false,
        draggable: false,
        mapTypeControlOptions: {
          mapTypeIds: ['grayscale']
        }
      }); 

      var mapType = new google.maps.StyledMapType(styles, { name: "Design Within Reach" });
      this.map.mapTypes.set('grayscale', mapType);
      this.map.setMapTypeId('grayscale');

      this.addMarker(this.map, self.lat, self.lng);  

      google.maps.event.addDomListener(window, "resize", function() {
        var center = self.map.getCenter();
        google.maps.event.trigger(self.map, "resize");
        self.map.setCenter(center); 
      });    
    },
    addMarker: function(map, lat, lng) {
      var self = this;
      var marker = new google.maps.Marker({
          position: new google.maps.LatLng(lat, lng),
          title: "Design Within Reach",
          map: map,
          icon: {
            url: Urls.googleMapMarkerIcon,
            scaledSize: new google.maps.Size(40, 40)
          }
      });

      this.markers.push(marker);
    },
    changeMarker: function(lat, lng) {
      var latlng = new google.maps.LatLng(lat, lng);
      this.markers[0].setPosition( latlng );
      this.map.panTo( latlng );
      
    }
  });

  return AppointmentMapView;
});