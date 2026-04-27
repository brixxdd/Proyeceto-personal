'use strict';

exports.up = function (pgm) {
  pgm.addColumns('delivery_people', {
    user_id: {
      type: 'uuid',
    },
  });
  pgm.createIndex('delivery_people', 'user_id');
};

exports.down = function (pgm) {
  pgm.dropIndex('delivery_people', 'user_id');
  pgm.dropColumns('delivery_people', ['user_id']);
};
