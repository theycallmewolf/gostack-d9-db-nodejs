import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('invalid customer ID');
    }

    const productsFound = await this.productsRepository.findAllById(products);
    if (!productsFound) {
      throw new AppError('products ID not found');
    }

    const productsFoundIDs = productsFound.map(product => product.id);
    const checkInexistentProducts = products.filter(
      product => !productsFoundIDs.includes(product.id),
    );

    if (checkInexistentProducts.length) {
      const productsNotFoundIDs = checkInexistentProducts.map(product => product.id);
      throw new AppError(`couldn\'t find product IDs ${String(productsNotFoundIDs)}`);
    }

    const productsWithoutEnoughQuantity = products.filter(
      product =>
        productsFound.filter(pFound => pFound.id === product.id)[0].quantity < product.quantity
    );

    if (productsWithoutEnoughQuantity.length) {
      const productsWithoutEnoughQuantityIDs = productsWithoutEnoughQuantity.map(product => product.id);
      throw new AppError(`not enough quantity for product IDs ${String(productsWithoutEnoughQuantityIDs)}`);
    }

    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: productsFound.filter(products => products.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: serializedProducts,
    })

    const { order_products } = order;

    const orderedProductsQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity: productsFound.filter(pFound => pFound.id === product.product_id)[0].quantity - product.quantity,
    }));

    await this.productsRepository.updateQuantity(orderedProductsQuantity);

    return order;
  }
}

export default CreateOrderService;
