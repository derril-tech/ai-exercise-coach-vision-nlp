import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findById(id: string) {
    // TODO: Implement user lookup logic
    return {
      message: 'User lookup - to be implemented',
      id,
    };
  }
}
