const Delivery = require("../models/Delivery");
const { optimizeRoute } = require("../config/ors");

// Create new delivery
exports.createDelivery = async (req, res) => {
  try {
    const { vendorId, pickupLocation, deliveryLocation, productType, weight } =
      req.body;

    const delivery = new Delivery({
      vendor: vendorId,
      pickupLocation,
      deliveryLocation,
      productType,
      weight,
      status: "pending",
    });

    await delivery.save();

    // In a real app, you would queue this for optimization
    res.status(201).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Optimize delivery route
exports.optimizeRoute = async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        error: "At least two coordinates are required",
      });
    }

    const optimizedRoute = await optimizeRoute(coordinates);

    res.status(200).json({
      success: true,
      data: optimizedRoute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get rider's deliveries
exports.getRiderDeliveries = async (req, res) => {
  try {
    const { riderId } = req.params;

    const deliveries = await Delivery.find({
      rider: riderId,
      status: { $in: ["assigned", "in-progress"] },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
