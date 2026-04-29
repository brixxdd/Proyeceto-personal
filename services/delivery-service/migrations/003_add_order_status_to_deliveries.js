'use strict';

exports.up = function (pgm) {
  pgm.addColumn('deliveries', {
    order_status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PENDING',
    },
  });
  pgm.createIndex('deliveries', 'order_status');
};

exports.down = function (pgm) {
  pgm.dropColumn('deliveries', 'order_status');
};
