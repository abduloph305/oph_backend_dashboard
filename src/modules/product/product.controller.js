import Product from "./product.model.js";

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    next(err);
  }
};