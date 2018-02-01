const URL = require('url')


TEST('get module', ()=>{
  const helper = MODULE('MongoHelper')
  OK(helper, 'got module')
  OK(F.MongoDB, 'got db instance')
  OK(typeof F.MongoDB.collection === 'function' , 'got collection')
})

TEST('test cursorOption', () => {
  const mockedQsObject = {
    sort: ['name:1', 'date:-1'],
    project: ['name:1', 'date:1', 'data:1'],
    page: '2',
    per_page: '11',
    name: 'john'
  }
  const helper = MODULE('MongoHelper')
  const option = helper.cursorOption(mockedQsObject.sort, mockedQsObject.project, mockedQsObject.page, mockedQsObject.per_page)
  OK(option.sort.name === 1)
  OK(option.sort.date === -1)
  OK(option.project.name === 1)
  OK(option.project.date === 1)
  OK(option.project.data === 1)
  OK(option.skip === 11)
  OK(option.limit === 22)
})

TEST('createFindCursor', () => {
  const collection = F.MongoDB.collection('test')
  const mocked = {
    name: 'test',
    data: 'test data....'
  }
  collection.insertOne(mocked).then(() => {
    const helper = MODULE('MongoHelper')
    const cursor = helper.createFindCursor(collection, mocked, {skip: 0, limit: 10})
    return cursor.toArray()
  }).then((docs) => {
    OK(docs.length)
    OK(docs[0].name === 'test')
    OK(docs[0].data === 'test data....')
  }).catch((err) => {
    FAIL(!!err, err.toString())
  })
})

TEST('parsedMongoError', () => {
  const mocked = new Error('MongoError: E1100 this is test error description')
  const helper = MODULE('MongoHelper')
  const totalError = helper.parsedMongoError(mocked)
  OK(totalError.name === 'MongoError')
  OK(totalError.error === 'this is test error description')
  OK(totalError.path === 'E1100')
})

TEST('composePaginationData', () => {
  const helper = MODULE('MongoHelper')
  const mockedQsObj = {
    name: 'A',
    sort: ['name:1'],
    project: ['name:1', 'date:1'],
    page: '2',
    per_page: '1'
  }
  const mockedReq = {
    headers: {
      host: 'mydomain'
    },
    connection: {},
    url: '/query'
  }
  const pagination = helper.composePagination(mockedQsObj, mockedReq, 3)
  const next = URL.parse(pagination.next_page_url, true, true)
  OK(next.host === 'mydomain')
  OK(next.protocol === 'http:')
  OK(pagination.current_page === 2, 'cur page')
  OK(pagination.per_page === 1, 'per page')
  OK(pagination.total === 3, 'total')
  OK(pagination.last_page === 3, 'last page')
  OK(pagination.from === 2, 'from')
  OK(pagination.to === 2, 'to')

  const nextQueryOption = helper.cursorOption(next.query.sort, next.query.project, next.query.page, next.query.per_page)
  OK(nextQueryOption.sort.name === 1)
  OK(nextQueryOption.project.name === 1 && nextQueryOption.project.date === 1)
  OK(nextQueryOption.skip === 2)
  OK(nextQueryOption.limit === 3)
})

TEST('MongoQuery', () => {
  const mocked = {
    name: 'ta',
    gender: 'male',
    age: '10'
  }
  const query = MODULE('MongoHelper').createMongoQuery(mocked)
  query
    .queryKey('name', val => {
      return {$regex: val}
    })
    .queryKey('money', val => {
      return {$gt: val}
    })
    .queryKey('gender')
    .queryKey('age', val => {
      return {$gt: parseInt(val)}
    })
  OK(query.name.$regex === 'ta')
  OK(!query.money)
  OK(query.gender === 'male')
  OK(query.age.$gt === 10)
})