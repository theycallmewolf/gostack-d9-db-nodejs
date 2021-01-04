import { Request, Response } from 'express';
import { container } from 'tsyringe';

import CreateCustomerService from '@modules/customers/services/CreateCustomerService';


export default class CustomersController {
  public async create(request: Request, response: Response): Promise<Response> {
    const { name, email } = request.body;
    const createCostumer = container.resolve(CreateCustomerService);
    const costumer = await createCostumer.execute({ name, email });

    return response.json(costumer);
  }
}
